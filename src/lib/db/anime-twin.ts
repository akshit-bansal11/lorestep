import { sql } from "drizzle-orm";

/**
 * True when another live entry of the same user is already kind anime under this `title_norm`, so
 * moving this one to anime would make two of the same title. Outer-row references name the table
 * outright (see `KEEP` in services/sync/push.ts).
 */
export const ANIME_TWIN = sql<boolean>`EXISTS (SELECT 1 FROM entries twin
  WHERE twin.user_id = "entries"."user_id" AND twin.title_norm = "entries"."title_norm"
    AND twin.kind = 'anime' AND twin.deleted_at IS NULL AND twin.id <> "entries"."id")`;
