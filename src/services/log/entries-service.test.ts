import { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HttpError } from "@/lib/http/http-error";
import {
  createEntry,
  deleteEntry,
  getEntry,
  listEntries,
  updateEntry,
} from "@/services/log/entries-service";

// A stand-in for the drizzle builder: every step returns another awaitable step, `where` records
// its condition, and awaiting yields `state.rows`. `execute` answers `state.execute`.
const state = vi.hoisted(() => ({
  rows: new Array<unknown>(),
  where: new Array<unknown>(),
  execute: (): Promise<unknown> => Promise.resolve({ rows: [] }),
}));

vi.mock("@/lib/db/client", () => {
  function chain(): unknown {
    return Object.assign(Promise.resolve(state.rows), {
      select: chain,
      from: chain,
      update: chain,
      set: chain,
      orderBy: chain,
      limit: chain,
      returning: chain,
      execute: () => state.execute(),
      where: (condition: unknown) => {
        state.where.push(condition);
        return chain();
      },
    });
  }
  return { db: chain };
});

const USER_B = "user-b";
const ID = "0b6f3c1e-8a5d-4c2b-9e7f-1a2b3c4d5e6f";

function lastWhere() {
  const condition = state.where.at(-1);
  if (!(condition instanceof SQL)) throw new Error("no WHERE recorded");
  return new PgDialect().sqlToQuery(condition);
}

describe("entries service", () => {
  beforeEach(() => {
    state.rows = [];
    state.where = [];
    state.execute = () => Promise.resolve({ rows: [] });
  });

  it.each([
    ["get", () => getEntry(USER_B, ID)],
    ["update", () => updateEntry(USER_B, ID, { notes: "x" })],
    ["delete", () => deleteEntry(USER_B, ID)],
  ] as const)("%s scopes the id to the caller and finds no foreign row", async (_, run) => {
    const result = await run();

    expect(result === null || result === false).toBe(true);
    const { sql, params } = lastWhere();
    expect(sql).toContain('"entries"."id" = $');
    expect(sql).toContain('"entries"."user_id" = $');
    expect(sql).toContain('"entries"."deleted_at" is null');
    expect(params).toEqual(expect.arrayContaining([ID, USER_B]));
  });

  it("lists only the caller's live entries", async () => {
    await listEntries(USER_B, { limit: 50 });

    const { sql, params } = lastWhere();
    expect(sql).toContain('"entries"."user_id" = $');
    expect(sql).toContain('"entries"."deleted_at" is null');
    expect(params).toContain(USER_B);
  });

  it("refuses a cursor it did not mint", async () => {
    await expect(listEntries(USER_B, { limit: 50, cursor: "bm9wZQ" })).rejects.toMatchObject({
      status: 400,
    });
  });

  it("answers 409 duplicate on a unique violation", async () => {
    state.execute = () => Promise.reject(Object.assign(new Error("dup"), { code: "23505" }));

    const created = createEntry(USER_B, { kind: "movie", title: "Dune" });

    await expect(created).rejects.toBeInstanceOf(HttpError);
    await expect(created).rejects.toMatchObject({ status: 409, code: "duplicate" });
  });

  it("answers 409 limit when the capped insert returns no row", async () => {
    await expect(createEntry(USER_B, { kind: "movie", title: "Dune" })).rejects.toMatchObject({
      status: 409,
      code: "limit",
    });
  });
});
