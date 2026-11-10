import type { SQL } from "drizzle-orm";

import type { db } from "@/lib/db/client";

/** A drizzle client from `db()`, for helpers that must share one client (one `batch`). */
export type DbClient = ReturnType<typeof db>;

/** UPDATE `set` fragment for the Started and Completed dates (`lib/db/status-dates.ts`). */
export interface StatusDatesSet {
  startedAt?: SQL;
  completedAt?: SQL;
}
