import { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HttpError } from "@/lib/http/http-error";
import {
  addListItem,
  createList,
  deleteList,
  deleteListItem,
  getList,
  listLists,
  reorderListItems,
  updateList,
} from "@/services/log/lists-service";

// A stand-in for the drizzle builder: every step returns another awaitable step, `where` records
// its condition, and awaiting yields `state.selectRows` for a select, `state.rows` otherwise.
// `execute` answers `state.execute`.
const state = vi.hoisted(() => {
  const rows: unknown[] = [];
  const selectRows: unknown[] = [];
  const where: unknown[] = [];
  return {
    rows,
    selectRows,
    where,
    execute: (): Promise<unknown> => Promise.resolve({ rows: [] }),
  };
});

vi.mock("@/lib/db/client", () => {
  function chain(rows: unknown): unknown {
    const next = () => chain(rows);
    return Object.assign(Promise.resolve(rows), {
      from: next,
      set: next,
      orderBy: next,
      limit: next,
      returning: next,
      where: (condition: unknown) => {
        state.where.push(condition);
        return next();
      },
    });
  }
  return {
    db: () => ({
      select: () => chain(state.selectRows),
      update: () => chain(state.rows),
      delete: () => chain(state.rows),
      execute: () => state.execute(),
    }),
  };
});

const USER_B = "user-b";
const LIST = "0b6f3c1e-8a5d-4c2b-9e7f-1a2b3c4d5e6f";
const A = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
const B = "1b4e28ba-2fa1-4d3b-a3fc-2c963f66afa6";
const LIST_ROW = {
  id: LIST,
  name: "x",
  description: "",
  kinds: [],
  itemCount: 0,
  createdAt: new Date(0),
  updatedAt: new Date(0),
};
const ITEM = { kind: "movie", title: "Heat" } as const;

const code = (promise: Promise<unknown>) =>
  promise.then(
    () => null,
    (error: unknown) => (error instanceof HttpError ? `${error.status} ${error.code}` : error),
  );

function lastWhere() {
  const condition = state.where.at(-1);
  if (!(condition instanceof SQL)) throw new Error("no WHERE recorded");
  return new PgDialect().sqlToQuery(condition);
}

describe("lists service", () => {
  beforeEach(() => {
    state.rows = [];
    state.selectRows = [];
    state.where = [];
    state.execute = () => Promise.resolve({ rows: [] });
  });

  it.each([
    ["get", () => getList(USER_B, LIST)],
    ["update", () => updateList(USER_B, LIST, { name: "x" })],
    ["delete", () => deleteList(USER_B, LIST)],
  ] as const)("%s scopes the id to the caller and finds no foreign list", async (_, run) => {
    const result = await run();

    expect(result === null || result === false).toBe(true);
    const { sql, params } = lastWhere();
    expect(sql).toContain('"lists"."id" = $');
    expect(sql).toContain('"lists"."user_id" = $');
    expect(sql).toContain('"lists"."deleted_at" is null');
    expect(params).toEqual(expect.arrayContaining([LIST, USER_B]));
  });

  it("lists only the caller's live lists", async () => {
    await listLists(USER_B);

    const { sql, params } = lastWhere();
    expect(sql).toContain('"lists"."user_id" = $');
    expect(sql).toContain('"lists"."deleted_at" is null');
    expect(params).toContain(USER_B);
  });

  it("deletes an item only through the caller's id, list and live-list check", async () => {
    expect(await deleteListItem(USER_B, LIST, A)).toBe(false);

    const { sql, params } = lastWhere();
    expect(sql).toContain('"list_items"."user_id" = $');
    expect(sql).toContain('"list_items"."list_id" = $');
    expect(sql).toContain("lists.deleted_at IS NULL");
    expect(params).toEqual(expect.arrayContaining([A, LIST, USER_B]));
  });

  it("answers 409 limit when the list cap stops the insert", async () => {
    expect(await code(createList(USER_B, { name: "x" }))).toBe("409 limit");
  });

  it("answers 409 duplicate on a unique violation", async () => {
    state.execute = () => Promise.reject({ code: "23505" });

    expect(await code(createList(USER_B, { name: "x" }))).toBe("409 duplicate");
    expect(await code(addListItem(USER_B, LIST, ITEM))).toBe("409 duplicate");
  });

  it("tells a foreign list (404) from a full one (409) when an item insert returns no row", async () => {
    expect(await code(addListItem(USER_B, LIST, ITEM))).toBe("404 not_found");

    state.selectRows = [LIST_ROW];
    expect(await code(addListItem(USER_B, LIST, ITEM))).toBe("409 limit");
  });

  it("refuses a reorder naming a foreign, missing or partial id set", async () => {
    state.selectRows = [LIST_ROW];
    const run = vi.fn();
    state.execute = run;

    expect(await code(reorderListItems(USER_B, LIST, [A, B]))).toBe("400 invalid_order");
    expect(run).not.toHaveBeenCalled();
  });

  it("refuses a reorder on a list the caller does not own", async () => {
    expect(await code(reorderListItems(USER_B, LIST, [A]))).toBe("404 not_found");
  });
});
