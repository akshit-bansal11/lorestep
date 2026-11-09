-- Domain tables: the unified library (entries), Dogear's tile links (entry_links), and user lists
-- (lists, list_items). Shapes follow PLAN.md section 4; the status model is section 3. Mirrored by
-- the Drizzle schema in src/lib/db/schema.ts. Each column carries its DB-14 classification, every
-- free-text field its DB-24 length cap. No FK to the catalog tables. Re-runnable (DB-D06).

CREATE TABLE IF NOT EXISTS entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),           -- neither
  user_id text NOT NULL REFERENCES users (id) ON DELETE CASCADE, -- personal (owner id)
  kind text NOT NULL,                                      -- neither
  title text NOT NULL,                                     -- neither
  title_norm text NOT NULL,                                -- neither (match key)
  year smallint,                                           -- neither
  status text,                                             -- personal (viewing history)
  status_at timestamptz,                                   -- personal (last-write-wins clock)
  shelf text,                                              -- personal
  rating smallint,                                         -- personal
  notes text NOT NULL DEFAULT '',                          -- personal
  progress jsonb NOT NULL DEFAULT '{}',                    -- personal
  repeat_count integer NOT NULL DEFAULT 0,                 -- personal
  device text,                                             -- personal
  storefront text,                                         -- personal
  game_id text,                                            -- neither (catalog games.id, no FK)
  ext_source text,                                         -- neither
  ext_id text,                                             -- neither
  image_url text,                                          -- neither
  started_at timestamptz,                                  -- personal
  completed_at timestamptz,                                -- personal
  created_at timestamptz NOT NULL DEFAULT now(),           -- neither
  updated_at timestamptz NOT NULL DEFAULT now(),           -- neither
  deleted_at timestamptz,                                  -- neither
  CONSTRAINT entries_id_user_id_key UNIQUE (id, user_id),
  CONSTRAINT entries_kind_check CHECK (kind IN ('movie', 'series', 'anime', 'manga', 'game')),
  CONSTRAINT entries_title_length CHECK (char_length(title) BETWEEN 1 AND 160),
  CONSTRAINT entries_status_check CHECK (
    status IN ('planned', 'in_progress', 'completed', 'on_hold', 'dropped')
  ),
  -- A CHECK passes when its expression is NULL, so the IN checks below leave the column nullable.
  CONSTRAINT entries_shelf_check CHECK (shelf IN ('own', 'wishlist', 'trash')),
  CONSTRAINT entries_shelf_game_only CHECK (shelf IS NULL OR kind = 'game'),
  CONSTRAINT entries_rating_range CHECK (rating BETWEEN 1 AND 10),
  CONSTRAINT entries_notes_length CHECK (char_length(notes) <= 4000),
  CONSTRAINT entries_progress_object CHECK (jsonb_typeof(progress) = 'object'),
  CONSTRAINT entries_repeat_count_check CHECK (repeat_count >= 0),
  CONSTRAINT entries_ext_source_check CHECK (
    ext_source IN ('tmdb', 'omdb', 'mal', 'igdb')
  ),
  CONSTRAINT entries_image_url_check CHECK (
    image_url LIKE 'https://%' AND char_length(image_url) <= 500
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS entries_user_game_key ON entries (user_id, game_id)
  WHERE game_id IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS entries_user_ext_key ON entries (user_id, ext_source, ext_id)
  WHERE ext_id IS NOT NULL AND deleted_at IS NULL;

-- Hot queries and the plan each is expected to take (DB-22). UNVERIFIED until run on the CI
-- branch (OPEN_ITEMS.md); the real plans go in the pull request.
-- 1. Library list:
--    SELECT ... FROM entries WHERE user_id = $1 AND kind = $2 AND deleted_at IS NULL [AND status = $3]
--    -> Index Scan using entries_library_idx (Index Cond: user_id, kind[, status])
CREATE INDEX IF NOT EXISTS entries_library_idx ON entries (user_id, kind, status)
  WHERE deleted_at IS NULL;
-- 2. Dogear matching:
--    SELECT ... FROM entries WHERE user_id = $1 AND title_norm = $2 AND deleted_at IS NULL
--    -> Index Scan using entries_match_idx (Index Cond: user_id, title_norm)
CREATE INDEX IF NOT EXISTS entries_match_idx ON entries (user_id, title_norm, kind)
  WHERE deleted_at IS NULL;
-- 3. Sync cursor (includes tombstones):
--    SELECT ... FROM entries WHERE user_id = $1 AND (updated_at, id) > ($2, $3)
--    ORDER BY updated_at, id LIMIT $4
--    -> Limit -> Index Scan using entries_sync_idx (Index Cond: user_id, row comparison; no Sort)
CREATE INDEX IF NOT EXISTS entries_sync_idx ON entries (user_id, updated_at, id);
-- 4. Purge sweep:
--    DELETE FROM entries WHERE deleted_at IS NOT NULL AND deleted_at < $1
--    -> Index Scan using entries_deleted_at_idx (Index Cond: deleted_at < $1)
CREATE INDEX IF NOT EXISTS entries_deleted_at_idx ON entries (deleted_at)
  WHERE deleted_at IS NOT NULL;

-- Dogear tile -> entry. The composite FK means a link can never point at another user's entry.
CREATE TABLE IF NOT EXISTS entry_links (
  user_id text NOT NULL,                                   -- personal (owner id)
  platform text NOT NULL,                                  -- neither
  platform_id text NOT NULL,                               -- neither
  entry_id uuid NOT NULL,                                  -- neither
  url text,                                                -- personal (viewing history)
  updated_at timestamptz NOT NULL DEFAULT now(),           -- neither
  PRIMARY KEY (user_id, platform, platform_id),
  CONSTRAINT entry_links_entry_fkey FOREIGN KEY (entry_id, user_id)
    REFERENCES entries (id, user_id) ON DELETE CASCADE,
  CONSTRAINT entry_links_platform_check CHECK (
    platform IN ('netflix', 'primevideo', 'hotstar', 'zee5', 'hbomax', 'crunchyroll')
  ),
  CONSTRAINT entry_links_platform_id_check CHECK (
    char_length(platform_id) <= 128 AND platform_id ~ '^[A-Za-z0-9_-]+$'
  ),
  CONSTRAINT entry_links_url_check CHECK (
    url LIKE 'https://%' AND char_length(url) <= 500
  )
);
CREATE INDEX IF NOT EXISTS entry_links_entry_id_idx ON entry_links (entry_id);

CREATE TABLE IF NOT EXISTS lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),           -- neither
  user_id text NOT NULL REFERENCES users (id) ON DELETE CASCADE, -- personal (owner id)
  name text NOT NULL,                                      -- personal
  description text NOT NULL DEFAULT '',                    -- personal
  kinds text[] NOT NULL DEFAULT '{}',                      -- neither
  created_at timestamptz NOT NULL DEFAULT now(),           -- neither
  updated_at timestamptz NOT NULL DEFAULT now(),           -- neither
  deleted_at timestamptz,                                  -- neither
  CONSTRAINT lists_id_user_id_key UNIQUE (id, user_id),
  CONSTRAINT lists_name_length CHECK (char_length(name) BETWEEN 1 AND 80),
  CONSTRAINT lists_description_length CHECK (char_length(description) <= 500),
  CONSTRAINT lists_kinds_check CHECK (
    kinds <@ ARRAY['movie', 'series', 'anime', 'manga', 'game']::text[]
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS lists_user_name_key ON lists (user_id, name)
  WHERE deleted_at IS NULL;
-- Lists page: WHERE user_id = $1 AND deleted_at IS NULL ORDER BY updated_at DESC
--   -> Index Scan Backward using lists_user_updated_idx (UNVERIFIED, as above).
CREATE INDEX IF NOT EXISTS lists_user_updated_idx ON lists (user_id, updated_at)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),           -- neither
  list_id uuid NOT NULL,                                   -- neither
  user_id text NOT NULL,                                   -- personal (owner id)
  kind text NOT NULL,                                      -- neither
  title text NOT NULL,                                     -- neither
  year smallint,                                           -- neither
  ext_source text,                                         -- neither
  ext_id text,                                             -- neither
  image_url text,                                          -- neither
  sort_order integer NOT NULL,                             -- neither
  added_at timestamptz NOT NULL DEFAULT now(),             -- neither
  CONSTRAINT list_items_list_fkey FOREIGN KEY (list_id, user_id)
    REFERENCES lists (id, user_id) ON DELETE CASCADE,
  CONSTRAINT list_items_kind_check CHECK (kind IN ('movie', 'series', 'anime', 'manga', 'game')),
  CONSTRAINT list_items_title_length CHECK (char_length(title) BETWEEN 1 AND 160),
  CONSTRAINT list_items_ext_source_check CHECK (
    ext_source IN ('tmdb', 'omdb', 'mal', 'igdb')
  ),
  CONSTRAINT list_items_image_url_check CHECK (
    image_url LIKE 'https://%' AND char_length(image_url) <= 500
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS list_items_list_ext_key ON list_items (list_id, ext_source, ext_id)
  WHERE ext_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS list_items_list_sort_idx ON list_items (list_id, sort_order);
