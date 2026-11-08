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
const COUNTS = {
  entries: 1,
  lists: 0,
  sessions: 3,
  verifications: 0,
  deviceCodes: 0,
  rateLimits: 9,
  authRateLimits: 4,
};

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

  it("cuts soft deletes at 30 days, expiries at now and limiter rows at one day", async () => {
    await purgeExpired(NOW);
    const { params } = lastQuery();

    expect(params).toEqual([
      "2026-10-09T04:00:00.000Z",
      "2026-10-09T04:00:00.000Z",
      "2026-11-08T04:00:00.000Z",
      "2026-11-08T04:00:00.000Z",
      "2026-11-08T04:00:00.000Z",
      NOW.getTime() / 1000 - 86_400,
      NOW.getTime() - 86_400_000,
    ]);
  });

  it("deletes only rows strictly older than each cutoff", async () => {
    await purgeExpired(NOW);
    const { sql } = lastQuery();

    expect(sql).toContain("DELETE FROM entries WHERE deleted_at < $1::timestamptz");
    expect(sql).toContain("DELETE FROM lists WHERE deleted_at < $2::timestamptz");
    expect(sql).toContain("DELETE FROM sessions WHERE expires_at < $3::timestamptz");
    expect(sql).toContain("DELETE FROM verifications WHERE expires_at < $4::timestamptz");
    expect(sql).toContain("DELETE FROM device_codes WHERE expires_at < $5::timestamptz");
    expect(sql).toContain("DELETE FROM rate_limits WHERE window_start < $6::bigint");
    expect(sql).toContain("DELETE FROM auth_rate_limits WHERE last_request < $7::bigint");
    expect(sql).not.toMatch(/DELETE FROM (users|accounts|entry_links|list_items)\b/);
  });

  it("throws when Postgres returns no counts row", async () => {
    state.rows = [];
    await expect(purgeExpired(NOW)).rejects.toThrow("no counts row");
  });
});
