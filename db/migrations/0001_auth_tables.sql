-- Better-Auth core tables (users, sessions, accounts, verifications), its deviceAuthorization
-- plugin table (device_codes) and its database rate-limit table (auth_rate_limits), plus the app's
-- own fixed-window limiter (rate_limits). Shapes follow the Better-Auth docs; tables are renamed
-- through `modelName` and columns are snake_case, mapped by the Drizzle schema in
-- src/lib/db/schema.ts. Each column carries its DB-14 classification. Re-runnable (DB-D06).

CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,                                   -- neither
  name text NOT NULL,                                    -- personal
  email text NOT NULL UNIQUE,                            -- personal
  email_verified boolean NOT NULL DEFAULT false,         -- neither
  image text,                                            -- personal (provider avatar URL)
  created_at timestamptz NOT NULL DEFAULT now(),         -- neither
  updated_at timestamptz NOT NULL DEFAULT now(),         -- neither
  CONSTRAINT users_name_length CHECK (char_length(name) BETWEEN 1 AND 100),
  CONSTRAINT users_email_length CHECK (char_length(email) <= 254), -- RFC 5321 path limit
  CONSTRAINT users_image_https CHECK (image IS NULL OR image LIKE 'https://%'),
  CONSTRAINT users_image_length CHECK (char_length(image) <= 500)
);

CREATE TABLE IF NOT EXISTS sessions (
  id text PRIMARY KEY,                                   -- neither
  token text NOT NULL UNIQUE,                            -- credential (stored raw: OPEN_ITEMS R1)
  expires_at timestamptz NOT NULL,                       -- neither
  ip_address text,                                       -- personal
  user_agent text,                                       -- personal
  user_id text NOT NULL REFERENCES users (id) ON DELETE CASCADE, -- personal (owner id)
  created_at timestamptz NOT NULL DEFAULT now(),         -- neither
  updated_at timestamptz NOT NULL DEFAULT now()          -- neither
);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);

CREATE TABLE IF NOT EXISTS accounts (
  id text PRIMARY KEY,                                   -- neither
  account_id text NOT NULL,                              -- personal (provider-side identity)
  provider_id text NOT NULL,                             -- neither
  user_id text NOT NULL REFERENCES users (id) ON DELETE CASCADE, -- personal (owner id)
  access_token text,                                     -- credential
  refresh_token text,                                    -- credential
  id_token text,                                         -- credential
  access_token_expires_at timestamptz,                   -- neither
  refresh_token_expires_at timestamptz,                  -- neither
  scope text,                                            -- neither
  password text,                                         -- credential (Argon2id hash)
  created_at timestamptz NOT NULL DEFAULT now(),         -- neither
  updated_at timestamptz NOT NULL DEFAULT now()          -- neither
);
CREATE INDEX IF NOT EXISTS accounts_user_id_idx ON accounts (user_id);

CREATE TABLE IF NOT EXISTS verifications (
  id text PRIMARY KEY,                                   -- neither
  identifier text NOT NULL,                              -- credential (token or OTP key)
  value text NOT NULL,                                   -- credential
  expires_at timestamptz NOT NULL,                       -- neither
  created_at timestamptz NOT NULL DEFAULT now(),         -- neither
  updated_at timestamptz NOT NULL DEFAULT now()          -- neither
);
CREATE INDEX IF NOT EXISTS verifications_identifier_idx ON verifications (identifier);

-- user_id is set on approval. The FK is ours, not the plugin's: it keeps a deleted user's
-- approvals from outliving them (DB-11).
CREATE TABLE IF NOT EXISTS device_codes (
  id text PRIMARY KEY,                                   -- neither
  device_code text NOT NULL UNIQUE,                      -- credential
  user_code text NOT NULL UNIQUE,                        -- credential
  user_id text REFERENCES users (id) ON DELETE CASCADE,  -- personal (owner id)
  client_id text,                                        -- neither
  scope text,                                            -- neither
  status text NOT NULL,                                  -- neither
  expires_at timestamptz NOT NULL,                       -- neither
  last_polled_at timestamptz,                            -- neither
  polling_interval integer,                              -- neither
  CONSTRAINT device_codes_code_length CHECK (
    char_length(device_code) <= 191 AND char_length(user_code) <= 191
  )
);

-- Better-Auth's own limiter (`rateLimit.storage = "database"`). `key` holds the client IP + path.
CREATE TABLE IF NOT EXISTS auth_rate_limits (
  id text PRIMARY KEY,                                   -- neither
  key text NOT NULL UNIQUE,                              -- personal (client IP)
  count integer NOT NULL,                                -- neither
  last_request bigint NOT NULL                           -- neither (epoch ms)
);

-- The app's limiter: one atomic upsert per request (PLAN.md D-11).
CREATE TABLE IF NOT EXISTS rate_limits (
  bucket text NOT NULL,                                  -- personal (user id or client IP)
  window_start bigint NOT NULL,                          -- neither (epoch seconds)
  count integer NOT NULL DEFAULT 0,                      -- neither
  PRIMARY KEY (bucket, window_start)
);
CREATE INDEX IF NOT EXISTS rate_limits_window_start_idx ON rate_limits (window_start);
