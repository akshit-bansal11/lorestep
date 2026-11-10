import { and, count, eq, inArray, isNull, lt, or, type SQL, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";

import { ENTRY_LIMITS } from "@/constants/log/entries";
import { SYNC_KINDS } from "@/constants/sync/sync";
import { db } from "@/lib/db/client";
import { entries, entryLinks } from "@/lib/db/schema";
import { HttpError } from "@/lib/http/http-error";
import { planPush } from "@/services/sync/plan-push";
import type { DbClient } from "@/types/db/db";
import type { PushOutcome, SyncCandidate, SyncMark, SyncOp } from "@/types/sync/sync";
import { normTitle } from "@/utils/log/norm-title";

/**
 * D-15's "keep" test, in SQL: a rating, notes, a shelf, or a live list item with the entry's
 * external id. List items carry no entry id, so an extension-created entry (no external id) is never
 * a list member.
 *
 * The subquery's references to the outer row name the table outright: drizzle renders
 * `${entries.userId}` as a bare "user_id" in a one-table select, which inside this subquery is
 * ambiguous (list_items and lists both have it, so Postgres refused every push) and "ext_source"
 * would bind to list_items' own column, comparing the item with itself.
 */
export const KEEP = sql<boolean>`(${entries.rating} IS NOT NULL OR ${entries.notes} <> ''
  OR ${entries.shelf} IS NOT NULL
  OR EXISTS (SELECT 1 FROM list_items li JOIN lists l ON l.id = li.list_id AND l.deleted_at IS NULL
    WHERE li.user_id = "entries"."user_id" AND li.ext_source = "entries"."ext_source"
      AND li.ext_id = "entries"."ext_id"))`;

/** The caller's links for these platform ids and the live entries they or the titles could hit. */
async function readState(client: DbClient, userId: string, marks: readonly SyncMark[]) {
  const platformIds = [...new Set(marks.map((mark) => mark.platformId))];
  const links = await client
    .select({
      platform: entryLinks.platform,
      platformId: entryLinks.platformId,
      entryId: entryLinks.entryId,
    })
    .from(entryLinks)
    .where(and(eq(entryLinks.userId, userId), inArray(entryLinks.platformId, platformIds)));

  const norms = [...new Set(marks.map((mark) => normTitle(mark.title)))].filter(Boolean);
  const reach: SQL[] = [];
  if (links.length > 0) reach.push(inArray(entries.id, [...new Set(links.map((l) => l.entryId))]));
  if (norms.length > 0) {
    const byTitle = and(inArray(entries.titleNorm, norms), inArray(entries.kind, [...SYNC_KINDS]));
    if (byTitle !== undefined) reach.push(byTitle);
  }
  if (reach.length === 0) return { links, candidates: [] };

  const rows = await client
    .select({
      id: entries.id,
      kind: entries.kind,
      titleNorm: entries.titleNorm,
      year: entries.year,
      status: entries.status,
      statusAt: entries.statusAt,
      keep: KEEP,
    })
    .from(entries)
    .where(and(eq(entries.userId, userId), isNull(entries.deletedAt), or(...reach)));
  const candidates: SyncCandidate[] = rows.map((row) => ({
    ...row,
    statusAt: row.statusAt?.getTime() ?? null,
  }));
  return { links, candidates };
}

/** One statement per planned write, every one scoped to the caller's `user_id`. */
function toStatement(client: DbClient, userId: string, op: SyncOp, now: Date): BatchItem<"pg"> {
  switch (op.type) {
    case "create":
      return client.insert(entries).values({
        id: op.id,
        userId,
        kind: op.kind,
        title: op.title,
        titleNorm: op.titleNorm,
        year: op.year,
        status: op.status,
        statusAt: new Date(op.statusAt),
      });
    case "status": {
      const at = new Date(op.statusAt);
      return client
        .update(entries)
        .set({
          status: op.status,
          statusAt: at,
          updatedAt: now,
          ...(op.remove ? { deletedAt: now } : {}),
        })
        .where(
          and(
            eq(entries.id, op.id),
            eq(entries.userId, userId),
            isNull(entries.deletedAt),
            // LWW again in the statement, so a concurrent newer write is never overwritten.
            or(isNull(entries.statusAt), lt(entries.statusAt, at)),
          ),
        );
    }
    case "link":
      return client
        .insert(entryLinks)
        .values({
          userId,
          platform: op.platform,
          platformId: op.platformId,
          entryId: op.entryId,
          url: op.url,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [entryLinks.userId, entryLinks.platform, entryLinks.platformId],
          set: {
            entryId: op.entryId,
            url: sql`coalesce(excluded.url, ${entryLinks.url})`,
            updatedAt: now,
          },
        });
    case "touch":
      return client
        .update(entries)
        .set({ updatedAt: now })
        .where(and(eq(entries.id, op.id), eq(entries.userId, userId)));
  }
}

/**
 * POST /api/v1/sync/push: two owner-scoped reads, the pure plan, then every write in one
 * `db.batch` (one transaction on neon-http). 409 `limit` when the new entries would pass the cap.
 */
export async function pushMarks(userId: string, marks: readonly SyncMark[]): Promise<PushOutcome> {
  const client = db();
  const { links, candidates } = await readState(client, userId, marks);
  const plan = planPush(marks, links, candidates, Date.now(), () => crypto.randomUUID());

  if (plan.creates > 0) {
    const [row] = await client
      .select({ live: count() })
      .from(entries)
      .where(and(eq(entries.userId, userId), isNull(entries.deletedAt)));
    // ponytail: read-then-write cap; two concurrent pushes can pass it by a few rows.
    if ((row?.live ?? 0) + plan.creates > ENTRY_LIMITS.perUser) {
      throw new HttpError(409, "limit", `Your library is full (${ENTRY_LIMITS.perUser} entries).`);
    }
  }

  const now = new Date();
  const [first, ...rest] = plan.ops.map((op) => toStatement(client, userId, op, now));
  if (first !== undefined) await client.batch([first, ...rest]);
  return { applied: plan.applied, skipped: plan.skipped, results: plan.results };
}
