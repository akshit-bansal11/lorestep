import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";

import { PG_UNIQUE_VIOLATION } from "@/constants/db/pg";
import { LIST_LIMITS } from "@/constants/log/lists";
import { db } from "@/lib/db/client";
import { pgErrorCode } from "@/lib/db/pg-error-code";
import { listItems, lists } from "@/lib/db/schema";
import { HttpError } from "@/lib/http/http-error";
import type {
  List,
  ListCreate,
  ListItem,
  ListItemCreate,
  ListPatch,
  ListWithItems,
} from "@/types/log/list";

/*
 * Every query names `user_id` in the same statement as the list id (SEC-01/02): a foreign id reads
 * like a missing one and the route answers 404. Item rows carry their own `user_id`, and the
 * composite FK (list_id, user_id) keeps them from ever crossing owners. Deletes are soft (D-16).
 */

/** Explicit columns (DB-21); `itemCount` is a correlated count scoped to the same owner. */
const LIST_COLUMNS = {
  id: lists.id,
  name: lists.name,
  description: lists.description,
  kinds: lists.kinds,
  itemCount: sql<number>`(SELECT count(*)::int FROM list_items WHERE list_items.list_id = ${lists.id} AND list_items.user_id = ${lists.userId})`,
  createdAt: lists.createdAt,
  updatedAt: lists.updatedAt,
};

const ITEM_COLUMNS = {
  id: listItems.id,
  kind: listItems.kind,
  title: listItems.title,
  year: listItems.year,
  extSource: listItems.extSource,
  extId: listItems.extId,
  imageUrl: listItems.imageUrl,
  sortOrder: listItems.sortOrder,
  addedAt: listItems.addedAt,
};

const ownLive = (userId: string, id: string) =>
  and(eq(lists.id, id), eq(lists.userId, userId), isNull(lists.deletedAt));

const toList = (row: {
  id: string;
  name: string;
  description: string;
  kinds: string[];
  itemCount: number;
  createdAt: Date;
  updatedAt: Date;
}): List => ({
  ...row,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

const toItem = (row: {
  id: string;
  kind: string;
  title: string;
  year: number | null;
  extSource: string | null;
  extId: string | null;
  imageUrl: string | null;
  sortOrder: number;
  addedAt: Date;
}): ListItem => ({
  id: row.id,
  kind: row.kind,
  title: row.title,
  year: row.year,
  ext:
    row.extSource !== null && row.extId !== null ? { source: row.extSource, id: row.extId } : null,
  imageUrl: row.imageUrl,
  sortOrder: row.sortOrder,
  addedAt: row.addedAt.toISOString(),
});

/** A unique violation is the client's doing (DB-23: no read-then-write); anything else is not. */
function rethrowAsDuplicate(error: unknown, message: string): never {
  if (pgErrorCode(error) === PG_UNIQUE_VIOLATION) throw new HttpError(409, "duplicate", message);
  throw error;
}

async function readList(userId: string, id: string): Promise<List | null> {
  const [row] = await db().select(LIST_COLUMNS).from(lists).where(ownLive(userId, id)).limit(1);
  return row === undefined ? null : toList(row);
}

export async function listLists(userId: string): Promise<List[]> {
  const rows = await db()
    .select(LIST_COLUMNS)
    .from(lists)
    .where(and(eq(lists.userId, userId), isNull(lists.deletedAt)))
    .orderBy(desc(lists.updatedAt), desc(lists.id))
    .limit(LIST_LIMITS.perUser);
  return rows.map((row) => toList(row));
}

/** The list with its items in order; `null` when the caller has no live list with this id. */
export async function getList(userId: string, id: string): Promise<ListWithItems | null> {
  const list = await readList(userId, id);
  if (list === null) return null;
  const items = await db()
    .select(ITEM_COLUMNS)
    .from(listItems)
    .where(and(eq(listItems.listId, id), eq(listItems.userId, userId)))
    .orderBy(asc(listItems.sortOrder), asc(listItems.addedAt))
    .limit(LIST_LIMITS.itemsPerList);
  return { ...list, items: items.map((item) => toItem(item)) };
}

/** One `INSERT ... SELECT ... WHERE count < cap`; no row back means the cap was reached. */
export async function createList(userId: string, input: ListCreate): Promise<List> {
  const kinds = (input.kinds ?? []).map((kind) => sql`${kind}`);
  let id: string | undefined;
  try {
    const result = await db().execute<{ id: string }>(sql`
      INSERT INTO lists (user_id, name, description, kinds)
      SELECT ${userId}, ${input.name}, ${input.description ?? ""},
        ARRAY[${sql.join(kinds, sql`, `)}]::text[]
      WHERE (SELECT count(*) FROM lists WHERE user_id = ${userId} AND deleted_at IS NULL)
        < ${LIST_LIMITS.perUser}
      RETURNING id`);
    id = result.rows[0]?.id;
  } catch (error) {
    rethrowAsDuplicate(error, "You already have a list with this name.");
  }
  if (id === undefined) {
    throw new HttpError(409, "limit", `You have the maximum of ${LIST_LIMITS.perUser} lists.`);
  }
  const list = await readList(userId, id);
  if (list === null) throw new Error(`List ${id} vanished right after insert`);
  return list;
}

/** `null` when the caller has no live list with this id. */
export async function updateList(
  userId: string,
  id: string,
  patch: ListPatch,
): Promise<List | null> {
  try {
    const rows = await db()
      .update(lists)
      .set({ ...patch, updatedAt: new Date() })
      .where(ownLive(userId, id))
      .returning({ id: lists.id });
    if (rows.length === 0) return null;
  } catch (error) {
    rethrowAsDuplicate(error, "You already have a list with this name.");
  }
  return readList(userId, id);
}

/** Soft delete; the items go with the list at purge. `false` when the caller has no live list. */
export async function deleteList(userId: string, id: string): Promise<boolean> {
  const now = new Date();
  const rows = await db()
    .update(lists)
    .set({ deletedAt: now, updatedAt: now })
    .where(ownLive(userId, id))
    .returning({ id: lists.id });
  return rows.length > 0;
}

/**
 * Appends one item in a single statement that also checks the owner, the live list and the item
 * cap. No row back is either a missing list (404) or a full one (409 `limit`); one read tells which.
 */
export async function addListItem(
  userId: string,
  listId: string,
  input: ListItemCreate,
): Promise<ListItem> {
  let id: string | undefined;
  try {
    const result = await db().execute<{ id: string }>(sql`
      INSERT INTO list_items (list_id, user_id, kind, title, year, ext_source, ext_id, image_url,
        sort_order)
      SELECT l.id, l.user_id, ${input.kind}, ${input.title}, ${input.year ?? null}::smallint,
        ${input.extSource ?? null}, ${input.extId ?? null}, ${input.imageUrl ?? null},
        COALESCE((SELECT max(sort_order) FROM list_items
          WHERE list_id = l.id AND user_id = l.user_id), -1) + 1
      FROM lists l
      WHERE l.id = ${listId} AND l.user_id = ${userId} AND l.deleted_at IS NULL
        AND (SELECT count(*) FROM list_items WHERE list_id = l.id AND user_id = l.user_id)
          < ${LIST_LIMITS.itemsPerList}
      RETURNING id`);
    id = result.rows[0]?.id;
  } catch (error) {
    rethrowAsDuplicate(error, "That title is already in this list.");
  }
  if (id === undefined) {
    if ((await readList(userId, listId)) === null) {
      throw new HttpError(404, "not_found", "That list does not exist.");
    }
    throw new HttpError(409, "limit", `A list holds at most ${LIST_LIMITS.itemsPerList} titles.`);
  }
  const [row] = await db()
    .select(ITEM_COLUMNS)
    .from(listItems)
    .where(and(eq(listItems.id, id), eq(listItems.userId, userId)))
    .limit(1);
  if (row === undefined) throw new Error(`List item ${id} vanished right after insert`);
  return toItem(row);
}

/** `false` when the caller has no such item in one of their live lists. */
export async function deleteListItem(
  userId: string,
  listId: string,
  itemId: string,
): Promise<boolean> {
  const rows = await db()
    .delete(listItems)
    .where(
      and(
        eq(listItems.id, itemId),
        eq(listItems.listId, listId),
        eq(listItems.userId, userId),
        sql`EXISTS (SELECT 1 FROM lists WHERE lists.id = ${listId} AND lists.user_id = ${userId} AND lists.deleted_at IS NULL)`,
      ),
    )
    .returning({ id: listItems.id });
  return rows.length > 0;
}

/**
 * Sets the order to `ids`. 404 for a missing list; 400 `invalid_order` unless `ids` is exactly the
 * list's item set (a foreign or stale id never reaches the UPDATE). One `UPDATE ... FROM unnest`.
 */
export async function reorderListItems(
  userId: string,
  listId: string,
  ids: string[],
): Promise<void> {
  if ((await readList(userId, listId)) === null) {
    throw new HttpError(404, "not_found", "That list does not exist.");
  }
  const current = await db()
    .select({ id: listItems.id })
    .from(listItems)
    .where(and(eq(listItems.listId, listId), eq(listItems.userId, userId)))
    .limit(LIST_LIMITS.itemsPerList);
  const known = new Set(current.map((row) => row.id));
  if (known.size !== ids.length || !ids.every((id) => known.has(id))) {
    throw new HttpError(400, "invalid_order", "Reload the list and try again.");
  }
  if (ids.length === 0) return;

  await db().execute(sql`
    UPDATE list_items AS li SET sort_order = v.ord
    FROM unnest(string_to_array(${ids.join(",")}, ',')::uuid[]) WITH ORDINALITY AS v(id, ord)
    WHERE li.id = v.id AND li.list_id = ${listId} AND li.user_id = ${userId}`);
}
