import { inArray, sql } from "drizzle-orm";

import { ENTRY_LIMITS } from "@/constants/log/entries";
import { db } from "@/lib/db/client";
import { games } from "@/lib/db/schema";
import { HttpError } from "@/lib/http/http-error";
import { toCanonical } from "@/mappers/log/status-mapper";
import type { CatalogGame, ImportResult, ImportRow, LocalMarks } from "@/types/log/import";
import { cleanTitle, normTitle } from "@/utils/log/norm-title";

/**
 * Local marks -> insert rows, through the status mapper so the stored `(status, shelf)` is exactly
 * what the games table would write. Marks for a game missing from the catalog are dropped (skipped).
 */
export function toImportRows(marks: LocalMarks, catalog: readonly CatalogGame[]): ImportRow[] {
  const titles = new Map(catalog.map((game) => [game.id, game.title]));
  return Object.entries(marks).flatMap(([gameId, mark]) => {
    const raw = titles.get(gameId);
    if (raw === undefined) return [];
    const title = cleanTitle(raw).slice(0, ENTRY_LIMITS.title) || gameId;
    return [
      {
        game_id: gameId,
        title,
        title_norm: normTitle(title),
        ...toCanonical(mark.status),
        device: mark.device ?? null,
        storefront: mark.storefront ?? null,
      },
    ];
  });
}

/**
 * Copies a browser's marks into the caller's library, insert-if-absent: a game the caller already
 * tracks keeps the server's row (server wins, never overwritten), so a repeat import inserts 0.
 * One statement (DB-23): `NOT EXISTS` skips tracked games, `ON CONFLICT DO NOTHING` covers a
 * concurrent insert, and the `LIMIT` keeps the per-user cap (DB-24). 413 past 1000 marks.
 */
export async function importLocal(userId: string, marks: LocalMarks): Promise<ImportResult> {
  const ids = Object.keys(marks);
  if (ids.length > ENTRY_LIMITS.importMax) {
    throw new HttpError(
      413,
      "too_large",
      `Import at most ${ENTRY_LIMITS.importMax} marks at a time.`,
    );
  }
  if (ids.length === 0) return { inserted: 0, skipped: 0 };

  const catalog = await db()
    .select({ id: games.id, title: games.title })
    .from(games)
    .where(inArray(games.id, ids));
  const rows = toImportRows(marks, catalog);
  if (rows.length === 0) return { inserted: 0, skipped: ids.length };

  const result = await db().execute<{ id: string }>(sql`
    INSERT INTO entries (user_id, kind, title, title_norm, status, status_at, shelf, notes, progress,
      repeat_count, device, storefront, game_id)
    SELECT ${userId}::uuid, 'game', r.title, r.title_norm, r.status,
      CASE WHEN r.status IS NULL THEN NULL ELSE now() END, r.shelf, '', '{}'::jsonb, 0,
      r.device, r.storefront, r.game_id
    FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb)
      AS r(game_id text, title text, title_norm text, status text, shelf text, device text,
        storefront text)
    WHERE NOT EXISTS (
      SELECT 1 FROM entries e
      WHERE e.user_id = ${userId} AND e.game_id = r.game_id AND e.deleted_at IS NULL)
    ORDER BY r.game_id
    LIMIT GREATEST(0, ${ENTRY_LIMITS.perUser}
      - (SELECT count(*) FROM entries WHERE user_id = ${userId} AND deleted_at IS NULL))
    ON CONFLICT (user_id, game_id) WHERE game_id IS NOT NULL AND deleted_at IS NULL DO NOTHING
    RETURNING id`);
  const inserted = result.rows.length;
  return { inserted, skipped: ids.length - inserted };
}
