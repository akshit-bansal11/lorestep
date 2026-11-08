import { and, desc, eq, isNull, type SQL, sql } from "drizzle-orm";

import { PG_CHECK_VIOLATION, PG_UNIQUE_VIOLATION } from "@/constants/db/pg";
import { ENTRY_LIMITS } from "@/constants/log/entries";
import { db } from "@/lib/db/client";
import { pgErrorCode } from "@/lib/db/pg-error-code";
import { entries, games } from "@/lib/db/schema";
import { HttpError } from "@/lib/http/http-error";
import { ENTRY_COLUMNS, toEntry } from "@/mappers/log/entry-mapper";
import { toCanonical } from "@/mappers/log/status-mapper";
import type {
  Entry,
  EntryCreate,
  EntryListQuery,
  EntryPage,
  EntryPatch,
  GameEntryInput,
} from "@/types/log/entry";
import { decodeCursor, encodeCursor } from "@/utils/log/entry-cursor";
import { cleanTitle, normTitle } from "@/utils/log/norm-title";

/*
 * Every query names `user_id` in the same WHERE as the record id (SEC-01/02), so a foreign id reads
 * exactly like a missing one and the route answers 404. Deletes are soft (D-16): `deleted_at` is
 * set and the row stays as a sync tombstone until the purge cron.
 */

/** The caller's live row `id`. */
const ownLive = (userId: string, id: string) =>
  and(eq(entries.id, id), eq(entries.userId, userId), isNull(entries.deletedAt));

/** A unique or CHECK violation is the client's doing (DB-23: no read-then-write); anything else is not. */
function rethrowAsClientError(error: unknown): never {
  const code = pgErrorCode(error);
  if (code === PG_UNIQUE_VIOLATION) {
    throw new HttpError(409, "duplicate", "This title is already in your library.");
  }
  if (code === PG_CHECK_VIOLATION) {
    throw new HttpError(400, "invalid_body", "Only games have a shelf, device or storefront.");
  }
  throw error;
}

const iso = (value: Date | null | undefined) => value?.toISOString() ?? null;

/** Newest-updated first, keyset-paginated on `(updated_at, id)` (the `entries_sync_idx` order). */
export async function listEntries(userId: string, query: EntryListQuery): Promise<EntryPage> {
  const where: SQL[] = [eq(entries.userId, userId), isNull(entries.deletedAt)];
  if (query.kind !== undefined) where.push(eq(entries.kind, query.kind));
  if (query.status !== undefined) where.push(eq(entries.status, query.status));
  if (query.q !== undefined) {
    const norm = normTitle(query.q);
    where.push(
      norm === ""
        ? sql`strpos(lower(${entries.title}), lower(${query.q})) > 0`
        : sql`strpos(${entries.titleNorm}, ${norm}) > 0`,
    );
  }
  if (query.cursor !== undefined) {
    const cursor = decodeCursor(query.cursor);
    if (cursor === null) throw new HttpError(400, "invalid_cursor", "Start the list again.");
    where.push(
      sql`(${entries.updatedAt}, ${entries.id}) < (${cursor.at}::timestamptz, ${cursor.id}::uuid)`,
    );
  }

  const rows = await db()
    .select({ ...ENTRY_COLUMNS, cursorAt: sql<string>`${entries.updatedAt}::text` })
    .from(entries)
    .where(and(...where))
    .orderBy(desc(entries.updatedAt), desc(entries.id))
    .limit(query.limit + 1);

  const page = rows.slice(0, query.limit);
  const last = page.at(-1);
  return {
    items: page.map((row) => toEntry(row)),
    nextCursor:
      rows.length > query.limit && last !== undefined
        ? encodeCursor({ at: last.cursorAt, id: last.id })
        : null,
  };
}

export async function getEntry(userId: string, id: string): Promise<Entry | null> {
  const [row] = await db().select(ENTRY_COLUMNS).from(entries).where(ownLive(userId, id)).limit(1);
  return row === undefined ? null : toEntry(row);
}

/**
 * One `INSERT ... SELECT ... WHERE count < cap` statement: the cap and the unique keys are checked
 * by the database, never read first. No row back means the cap was reached (409 `limit`).
 */
export async function createEntry(userId: string, input: EntryCreate): Promise<Entry> {
  const status = input.status ?? null;
  const statusAt = status === null ? null : iso(new Date());
  let id: string | undefined;
  try {
    const result = await db().execute<{ id: string }>(sql`
      INSERT INTO entries (user_id, kind, title, title_norm, year, status, status_at, shelf, rating,
        notes, progress, repeat_count, device, storefront, game_id, ext_source, ext_id, image_url,
        started_at, completed_at)
      SELECT ${userId}, ${input.kind}, ${input.title}, ${normTitle(input.title)},
        ${input.year ?? null}::smallint, ${status}, ${statusAt}::timestamptz,
        ${input.shelf ?? null}, ${input.rating ?? null}::smallint, ${input.notes ?? ""},
        ${JSON.stringify(input.progress ?? {})}::jsonb, ${input.repeatCount ?? 0}::integer,
        ${input.device ?? null}, ${input.storefront ?? null}, ${input.gameId ?? null},
        ${input.ext?.source ?? null}, ${input.ext?.id ?? null}, ${input.imageUrl ?? null},
        ${iso(input.startedAt)}::timestamptz, ${iso(input.completedAt)}::timestamptz
      WHERE (SELECT count(*) FROM entries WHERE user_id = ${userId} AND deleted_at IS NULL)
        < ${ENTRY_LIMITS.perUser}
      RETURNING id`);
    id = result.rows[0]?.id;
  } catch (error) {
    rethrowAsClientError(error);
  }
  if (id === undefined) {
    throw new HttpError(409, "limit", `Your library is full (${ENTRY_LIMITS.perUser} entries).`);
  }
  const entry = await getEntry(userId, id);
  if (entry === null) throw new Error(`Entry ${id} vanished right after insert`);
  return entry;
}

/** `null` when the caller has no live entry with this id. */
export async function updateEntry(
  userId: string,
  id: string,
  patch: EntryPatch,
): Promise<Entry | null> {
  const { title, status, ext, ...rest } = patch;
  const now = new Date();
  const set = {
    ...rest,
    ...(title === undefined ? {} : { title, titleNorm: normTitle(title) }),
    ...(status === undefined ? {} : { status, statusAt: now }),
    ...(ext === undefined ? {} : { extSource: ext?.source ?? null, extId: ext?.id ?? null }),
    updatedAt: now,
  };
  try {
    const [row] = await db()
      .update(entries)
      .set(set)
      .where(ownLive(userId, id))
      .returning(ENTRY_COLUMNS);
    return row === undefined ? null : toEntry(row);
  } catch (error) {
    rethrowAsClientError(error);
  }
}

/** Soft delete. `false` when the caller has no live entry with this id. */
export async function deleteEntry(userId: string, id: string): Promise<boolean> {
  const now = new Date();
  const rows = await db()
    .update(entries)
    .set({ deletedAt: now, updatedAt: now })
    .where(ownLive(userId, id))
    .returning({ id: entries.id });
  return rows.length > 0;
}

/**
 * The games table's status, device and storefront for one catalog game, replaced whole: upserted
 * on `(user_id, game_id)`, or soft-deleted (returns `null`) when all three are cleared. 404 when
 * the game is not in the catalog.
 * ponytail: skips the per-user cap; the catalog (under 1,000 games) bounds it. Add the cap if
 * game ids ever become user-supplied.
 */
export async function setGameEntry(
  userId: string,
  gameId: string,
  input: GameEntryInput,
): Promise<Entry | null> {
  const [game] = await db()
    .select({ title: games.title })
    .from(games)
    .where(eq(games.id, gameId))
    .limit(1);
  if (game === undefined) throw new HttpError(404, "not_found", "That game is not in the catalog.");

  const now = new Date();
  const device = input.device ?? null;
  const storefront = input.storefront ?? null;
  const ownGame = and(
    eq(entries.userId, userId),
    eq(entries.gameId, gameId),
    isNull(entries.deletedAt),
  );

  if (input.status === null && device === null && storefront === null) {
    await db().update(entries).set({ deletedAt: now, updatedAt: now }).where(ownGame);
    return null;
  }

  const state = input.status === null ? { status: null, shelf: null } : toCanonical(input.status);
  const fields = { ...state, statusAt: now, device, storefront, updatedAt: now };
  try {
    const [row] = await db()
      .insert(entries)
      .values({
        userId,
        kind: "game",
        gameId,
        title: cleanTitle(game.title).slice(0, ENTRY_LIMITS.title) || gameId,
        titleNorm: normTitle(game.title),
        ...fields,
      })
      .onConflictDoUpdate({
        target: [entries.userId, entries.gameId],
        targetWhere: sql`game_id IS NOT NULL AND deleted_at IS NULL`,
        set: fields,
      })
      .returning(ENTRY_COLUMNS);
    if (row === undefined) throw new Error(`Upsert of game ${gameId} returned no row`);
    return toEntry(row);
  } catch (error) {
    rethrowAsClientError(error);
  }
}
