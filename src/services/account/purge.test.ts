import { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { purgeExpired } from "@/services/account/purge";

// `execute` records its SQL and answers `state.rows`.
const state = vi.hoisted(() => {
  const executed: unknown[] = [];
  const rows: unknown[] = [];
  return { executed, rows };
});

vi.mock("@/lib/db/client", () => ({
  db: () => ({
    execute: (query: unknown) => {
      state.executed.push(query);
      return Promise.resolve({ rows: state.rows });
    },
  }),
}));

const NOW = new Date("2026-11-08T04:00:00.000Z");
const COUNTS = { entries: 1, lists: 0, rateLimits: 9 };

function lastQuery() {
  const query = state.executed.at(-1);
  if (!(query instanceof SQL)) throw new Error("nothing executed");
  return new PgDialect().sqlToQuery(query);
}

describe("purgeExpired", () => {
  beforeEach(() => {
    state.executed.length = 0;
    state.rows = [COUNTS];
  });

  it("returns the per-table counts", async () => {
    expect(await purgeExpired(NOW)).toEqual(COUNTS);
  });

  it("cuts soft deletes at 30 days and limiter rows at one day", async () => {
    await purgeExpired(NOW);
    const { params } = lastQuery();

    expect(params).toEqual([
      "2026-10-09T04:00:00.000Z",
      "2026-10-09T04:00:00.000Z",
      NOW.getTime() / 1000 - 86_400,
    ]);
  });

  it("deletes only rows strictly older than each cutoff, and no Neon Auth table", async () => {
    await purgeExpired(NOW);
    const { sql } = lastQuery();

    expect(sql).toContain("DELETE FROM entries WHERE deleted_at < $1::timestamptz");
    expect(sql).toContain("DELETE FROM lists WHERE deleted_at < $2::timestamptz");
    expect(sql).toContain("DELETE FROM rate_limits WHERE window_start < $3::bigint");
    expect(sql).not.toMatch(
      /sessions|verifications|device_codes|auth_rate_limits|users|accounts|neon_auth/,
    );
    expect(sql).not.toMatch(/DELETE FROM (entry_links|list_items)\b/);
  });

  it("throws when Postgres returns no counts row", async () => {
    state.rows = [];
    await expect(purgeExpired(NOW)).rejects.toThrow("no counts row");
  });
});
