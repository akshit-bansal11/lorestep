import { type SQL, sql } from "drizzle-orm";

import type { StatusDatesSet } from "@/types/db/db";

/*
 * Started and Completed are set once, by the first status write that reaches them, and never
 * overwritten: a rewatch keeps the first dates. The status time is the date.
 */

/** UPDATE `set` fragment: `COALESCE` in the statement, so two racing writes cannot both win. */
export function statusDatesSet(status: string | null, at: Date): StatusDatesSet {
  const iso = at.toISOString();
  if (status === "in_progress") {
    return { startedAt: sql`COALESCE("entries"."started_at", ${iso}::timestamptz)` };
  }
  if (status === "completed") {
    return { completedAt: sql`COALESCE("entries"."completed_at", ${iso}::timestamptz)` };
  }
  return {};
}

/** INSERT values for a new row: the date of the status it starts at, else null. */
export function statusDatesInsert(status: string | null, at: Date) {
  return {
    startedAt: status === "in_progress" ? at : null,
    completedAt: status === "completed" ? at : null,
  };
}
