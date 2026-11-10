import { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ENTRY_LIMITS } from "@/constants/log/entries";
import { KEEP, pushMarks } from "@/services/sync/push";
import type { SyncMark } from "@/types/sync/sync";

// Each `select` answers the next queued result and `where` records its condition. Writes are
// inert builders; `batch` records what it was handed.
const state = vi.hoisted(() => {
  const results: unknown[][] = [];
  const where: unknown[] = [];
  const batches: unknown[][] = [];
  return { results, where, batches };
});

vi.mock("@/lib/db/client", () => {
  function chain(rows: unknown): unknown {
    const next = () => chain(rows);
    return Object.assign(Promise.resolve(rows), {
      from: next,
      values: next,
      set: next,
      onConflictDoUpdate: next,
      where: (condition: unknown) => {
        state.where.push(condition);
        return next();
      },
    });
  }
  return {
    db: () => ({
      select: () => chain(state.results.shift() ?? []),
      insert: () => chain([]),
      update: () => chain([]),
      batch: (items: unknown[]) => {
        state.batches.push(items);
        return Promise.resolve([]);
      },
    }),
  };
});

const USER = "user-a";

const mark = (over: Partial<SyncMark> = {}): SyncMark => ({
  platform: "netflix",
  platformId: "81234",
  title: "The Boys",
  kind: "series",
  year: undefined,
  url: undefined,
  status: "in_progress",
  at: Date.now() - 1000,
  ...over,
});

const params = (condition: unknown) => {
  if (!(condition instanceof SQL)) throw new Error("expected SQL");
  return new PgDialect().sqlToQuery(condition).params;
};

beforeEach(() => {
  vi.clearAllMocks();
  state.results = [];
  state.where = [];
  state.batches = [];
});

describe("pushMarks", () => {
  it("scopes every read to the caller and writes everything in one batch", async () => {
    state.results = [[], [], [{ live: 3 }]];
    const outcome = await pushMarks(USER, [mark()]);

    expect(outcome.applied).toBe(1);
    expect(state.where.slice(0, 3).every((where) => params(where).includes(USER))).toBe(true);
    // The create and its link, together.
    expect(state.batches).toHaveLength(1);
    expect(state.batches[0]).toHaveLength(2);
  });

  it("answers 409 limit and writes nothing when new entries would pass the cap", async () => {
    state.results = [[], [], [{ live: ENTRY_LIMITS.perUser }]];
    await expect(pushMarks(USER, [mark()])).rejects.toMatchObject({ status: 409, code: "limit" });
    expect(state.batches).toHaveLength(0);
  });

  it("sends no batch when every mark is stale", async () => {
    const entryId = "00000000-0000-4000-8000-000000000001";
    state.results = [
      [{ platform: "netflix", platformId: "81234", entryId }],
      [
        {
          id: entryId,
          kind: "series",
          titleNorm: "the boys",
          year: null,
          status: "completed",
          statusAt: new Date(),
          keep: false,
        },
      ],
    ];
    const outcome = await pushMarks(USER, [mark({ at: Date.now() - 60_000 })]);

    expect(outcome).toMatchObject({ applied: 0, skipped: 1 });
    expect(outcome.results[0]).toMatchObject({ entryId, status: "completed" });
    expect(state.batches).toHaveLength(0);
  });
});

describe("KEEP", () => {
  it("names the outer entries row in its list subquery, so no column is ambiguous", () => {
    // Every push failed in production with 'column reference "user_id" is ambiguous'.
    const { sql: text } = new PgDialect().sqlToQuery(KEEP);
    expect(text).toContain('li.user_id = "entries"."user_id"');
    expect(text).toContain('li.ext_source = "entries"."ext_source"');
    expect(text).toContain('li.ext_id = "entries"."ext_id"');
    expect(text).not.toMatch(/= "(user_id|ext_source|ext_id)"/);
  });
});
