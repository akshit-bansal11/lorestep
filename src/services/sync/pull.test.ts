import { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HttpError } from "@/lib/http/http-error";
import { pullChanges } from "@/services/sync/pull";
import { decodeCursor, encodeCursor } from "@/utils/log/entry-cursor";

// Each `select` answers the next queued result; `where` records its condition.
const state = vi.hoisted(() => {
  const results: unknown[][] = [];
  const where: unknown[] = [];
  return { results, where };
});

vi.mock("@/lib/db/client", () => {
  function chain(rows: unknown): unknown {
    const next = () => chain(rows);
    return Object.assign(Promise.resolve(rows), {
      from: next,
      orderBy: next,
      limit: next,
      where: (condition: unknown) => {
        state.where.push(condition);
        return next();
      },
    });
  }
  return { db: () => ({ select: () => chain(state.results.shift() ?? []) }) };
});

const USER = "user-a";
const ID_1 = "00000000-0000-4000-8000-000000000001";
const ID_2 = "00000000-0000-4000-8000-000000000002";
const AT = "2026-11-08 10:00:00.123456+00";

const row = (id: string, deletedAt: Date | null = null) => ({
  id,
  kind: "series",
  title: "The Boys",
  year: null,
  status: "in_progress",
  shelf: null,
  rating: null,
  notes: "",
  progress: {},
  repeatCount: 0,
  device: null,
  storefront: null,
  gameId: null,
  extSource: null,
  extId: null,
  imageUrl: null,
  startedAt: null,
  completedAt: null,
  createdAt: new Date("2026-11-01T00:00:00Z"),
  updatedAt: new Date("2026-11-08T10:00:00Z"),
  deletedAt,
  cursorAt: AT,
});

const rendered = (condition: unknown) => {
  if (!(condition instanceof SQL)) throw new Error("expected SQL");
  return new PgDialect().sqlToQuery(condition);
};

beforeEach(() => {
  vi.clearAllMocks();
  state.results = [];
  state.where = [];
});

describe("pullChanges", () => {
  it("pages on (updated_at, id), so rows sharing an updated_at keep their order", async () => {
    // Two rows with the same updated_at: the cursor carries the id that breaks the tie.
    state.results = [[row(ID_1), row(ID_2)], []];
    const page = await pullChanges(USER, { limit: 2, since: encodeCursor({ at: AT, id: ID_1 }) });

    expect(decodeCursor(page.cursor ?? "")).toEqual({ at: AT, id: ID_2 });
    const query = rendered(state.where[0]);
    expect(query.sql).toContain('("entries"."updated_at", "entries"."id") > (');
    expect(query.params).toEqual(expect.arrayContaining([USER, AT, ID_1]));
  });

  it("includes tombstones and groups each entry's links", async () => {
    state.results = [
      [row(ID_1, new Date()), row(ID_2)],
      [{ entryId: ID_2, platform: "netflix", platformId: "81234", url: null }],
    ];
    const page = await pullChanges(USER, { limit: 50 });

    expect(page.changes.map((change) => change.deleted)).toEqual([true, false]);
    expect(page.changes[0]?.links).toEqual([]);
    expect(page.changes[1]?.links).toEqual([
      { platform: "netflix", platformId: "81234", url: null },
    ]);
    expect(rendered(state.where[1]).params).toContain(USER);
  });

  it("returns `since` unchanged when nothing is new", async () => {
    const since = encodeCursor({ at: AT, id: ID_1 });
    state.results = [[]];
    await expect(pullChanges(USER, { limit: 50, since })).resolves.toEqual({
      changes: [],
      cursor: since,
    });
  });

  it("rejects a cursor the server did not mint", async () => {
    const forged = Buffer.from("not-a-cursor").toString("base64url");
    await expect(pullChanges(USER, { limit: 50, since: forged })).rejects.toThrow(HttpError);
  });
});
