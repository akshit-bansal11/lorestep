import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { statusDatesInsert, statusDatesSet } from "@/lib/db/status-dates";

const AT = new Date("2026-11-01T10:00:00.000Z");
const render = (fragment: Parameters<PgDialect["sqlToQuery"]>[0]) =>
  new PgDialect().sqlToQuery(fragment);

describe("statusDatesSet", () => {
  it("fills started_at only when it is null, qualified on the entries row", () => {
    const { startedAt, completedAt } = statusDatesSet("in_progress", AT);
    if (startedAt === undefined) throw new Error("expected startedAt");
    expect(completedAt).toBeUndefined();
    const query = render(startedAt);
    expect(query.sql).toBe('COALESCE("entries"."started_at", $1::timestamptz)');
    expect(query.params).toEqual([AT.toISOString()]);
  });

  it("fills completed_at only when it is null", () => {
    const { startedAt, completedAt } = statusDatesSet("completed", AT);
    if (completedAt === undefined) throw new Error("expected completedAt");
    expect(startedAt).toBeUndefined();
    expect(render(completedAt).sql).toBe('COALESCE("entries"."completed_at", $1::timestamptz)');
  });

  it("touches neither date for any other status", () => {
    expect(statusDatesSet("planned", AT)).toEqual({});
    expect(statusDatesSet(null, AT)).toEqual({});
  });
});

describe("statusDatesInsert", () => {
  it("dates a new row by the status it starts at", () => {
    expect(statusDatesInsert("in_progress", AT)).toEqual({ startedAt: AT, completedAt: null });
    expect(statusDatesInsert("completed", AT)).toEqual({ startedAt: null, completedAt: AT });
    expect(statusDatesInsert("planned", AT)).toEqual({ startedAt: null, completedAt: null });
  });
});
