import type { db } from "@/lib/db/client";

/** A drizzle client from `db()`, for helpers that must share one client (one `batch`). */
export type DbClient = ReturnType<typeof db>;
