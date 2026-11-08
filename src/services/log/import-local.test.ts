import { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HttpError } from "@/lib/http/http-error";
import { importLocal, toImportRows } from "@/services/log/import-local";
import type { LocalMarks } from "@/types/log/import";

// The catalog select resolves to `state.catalog`; `execute` records its SQL and answers
// `state.returned` (the ids Postgres would hand back from RETURNING).
const state = vi.hoisted(() => ({
  catalog: new Array<{ id: string; title: string }>(),
  returned: new Array<{ id: string }>(),
  executed: new Array<unknown>(),
}));

vi.mock("@/lib/db/client", () => {
  const select = () => ({
    from: () => ({ where: () => Promise.resolve(state.catalog) }),
  });
  return {
    db: () => ({
      select,
      execute: (query: unknown) => {
        state.executed.push(query);
        return Promise.resolve({ rows: state.returned });
      },
    }),
  };
});

const USER = "user-a";
const MARKS: LocalMarks = {
  hl1: { status: "completed", device: "pc" },
  hl2: { status: "own" },
  portal: { status: "trash" },
};

function lastQuery() {
  const query = state.executed.at(-1);
  if (!(query instanceof SQL)) throw new Error("nothing executed");
  return new PgDialect().sqlToQuery(query);
}

describe("toImportRows", () => {
  it("maps each mark through the status mapper", () => {
    const rows = toImportRows(MARKS, [
      { id: "hl1", title: "Half-Life" },
      { id: "hl2", title: "Half-Life 2" },
      { id: "portal", title: "Portal" },
    ]);
    expect(rows.map(({ game_id, status, shelf }) => ({ game_id, status, shelf }))).toEqual([
      { game_id: "hl1", status: "completed", shelf: null },
      { game_id: "hl2", status: null, shelf: "own" },
      { game_id: "portal", status: "dropped", shelf: "trash" },
    ]);
    expect(rows[0]).toMatchObject({ title: "Half-Life", device: "pc", storefront: null });
  });

  it("drops marks for games missing from the catalog", () => {
    expect(toImportRows(MARKS, [{ id: "hl2", title: "Half-Life 2" }])).toHaveLength(1);
  });
});

describe("importLocal", () => {
  beforeEach(() => {
    state.catalog = [
      { id: "hl1", title: "Half-Life" },
      { id: "hl2", title: "Half-Life 2" },
      { id: "portal", title: "Portal" },
    ];
    state.returned = [];
    state.executed = [];
  });

  it("refuses more than 1000 marks with 413 before touching the database", async () => {
    const many: LocalMarks = {};
    for (let i = 0; i <= 1000; i += 1) many[`g${i}`] = { status: "playing" };
    const error = await importLocal(USER, many).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(HttpError);
    expect(error).toMatchObject({ status: 413, code: "too_large" });
    expect(state.executed).toHaveLength(0);
  });

  it("inserts only absent games and never updates an existing row", async () => {
    state.returned = [{ id: "e1" }, { id: "e2" }];
    expect(await importLocal(USER, MARKS)).toEqual({ inserted: 2, skipped: 1 });
    const { sql } = lastQuery();
    expect(sql).toMatch(/^\s*INSERT INTO entries/);
    expect(sql).toContain("WHERE NOT EXISTS");
    expect(sql).toContain("e.deleted_at IS NULL");
    expect(sql).toContain("DO NOTHING");
    expect(sql).not.toMatch(/\bUPDATE\b|DO UPDATE/);
  });

  it("is idempotent: a repeat run inserts nothing and skips every mark", async () => {
    state.returned = [{ id: "e1" }, { id: "e2" }, { id: "e3" }];
    expect(await importLocal(USER, MARKS)).toEqual({ inserted: 3, skipped: 0 });
    state.returned = [];
    expect(await importLocal(USER, MARKS)).toEqual({ inserted: 0, skipped: 3 });
  });

  it("scopes every clause to the caller and keeps the per-user cap", async () => {
    await importLocal(USER, MARKS);
    const { sql, params } = lastQuery();
    expect(sql).toContain("LIMIT GREATEST(0,");
    expect(params.filter((param) => param === USER)).toHaveLength(3);
  });

  it("skips everything without an insert when no mark names a catalog game", async () => {
    state.catalog = [];
    expect(await importLocal(USER, MARKS)).toEqual({ inserted: 0, skipped: 3 });
    expect(state.executed).toHaveLength(0);
  });

  it("answers an empty import without a query", async () => {
    expect(await importLocal(USER, {})).toEqual({ inserted: 0, skipped: 0 });
  });
});
