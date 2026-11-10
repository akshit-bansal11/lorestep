import { sql } from "drizzle-orm";

import { KEEP } from "@/services/sync/push";

/**
 * True when enrichment may move this entry's kind to anime: the extension created it (an
 * `entry_links` row, no external id) and the user never touched it (no progress, and the `KEEP`
 * test is false). The user cannot change a kind back (the PATCH schema omits it), so a hand-made
 * or edited entry is never moved. Outer-row references name the table outright (see `KEEP`).
 */
export const ANIME_MOVABLE = sql<boolean>`("entries"."ext_source" IS NULL
  AND "entries"."progress" = '{}'::jsonb
  AND EXISTS (SELECT 1 FROM entry_links el
    WHERE el.entry_id = "entries"."id" AND el.user_id = "entries"."user_id")
  AND NOT ${KEEP})`;
