import { and, asc, eq, inArray, type SQL, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { entries, entryLinks } from "@/lib/db/schema";
import { HttpError } from "@/lib/http/http-error";
import { ENTRY_COLUMNS, toEntry } from "@/mappers/log/entry-mapper";
import type { SyncPage, SyncPullQuery } from "@/types/sync/sync";
import { decodeCursor, encodeCursor } from "@/utils/log/entry-cursor";

/**
 * GET /api/v1/sync: the caller's entries changed after `since`, oldest first, keyset on
 * `(updated_at, id)` so rows sharing an `updated_at` are neither skipped nor repeated. Tombstones
 * (`deleted: true`) are included until the purge cron removes them (D-16). Each entry carries its
 * links. `cursor` is the last row's, or `since` unchanged when nothing is new.
 *
 * ponytail: a write committed with an `updated_at` earlier than a cursor already handed out is
 * missed until it changes again; add a small overlap window if Dogear ever shows stale marks.
 */
export async function pullChanges(userId: string, query: SyncPullQuery): Promise<SyncPage> {
  const where: SQL[] = [eq(entries.userId, userId)];
  if (query.kinds !== undefined) where.push(inArray(entries.kind, query.kinds));
  if (query.since !== undefined) {
    const cursor = decodeCursor(query.since);
    if (cursor === null) throw new HttpError(400, "invalid_cursor", "Pull again from the start.");
    where.push(
      sql`(${entries.updatedAt}, ${entries.id}) > (${cursor.at}::timestamptz, ${cursor.id}::uuid)`,
    );
  }

  const client = db();
  const rows = await client
    .select({
      ...ENTRY_COLUMNS,
      deletedAt: entries.deletedAt,
      cursorAt: sql<string>`${entries.updatedAt}::text`,
    })
    .from(entries)
    .where(and(...where))
    .orderBy(asc(entries.updatedAt), asc(entries.id))
    .limit(query.limit);

  const ids = rows.map((row) => row.id);
  const links =
    ids.length === 0
      ? []
      : await client
          .select({
            entryId: entryLinks.entryId,
            platform: entryLinks.platform,
            platformId: entryLinks.platformId,
            url: entryLinks.url,
          })
          .from(entryLinks)
          .where(and(eq(entryLinks.userId, userId), inArray(entryLinks.entryId, ids)));

  const last = rows.at(-1);
  return {
    changes: rows.map((row) => ({
      entry: toEntry(row),
      deleted: row.deletedAt !== null,
      links: links
        .filter((link) => link.entryId === row.id)
        .map(({ platform, platformId, url }) => ({ platform, platformId, url })),
    })),
    cursor:
      last === undefined ? (query.since ?? null) : encodeCursor({ at: last.cursorAt, id: last.id }),
  };
}
