import { sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { HttpError } from "@/lib/http/http-error";
import { USER_TABLES } from "@/services/account/user-tables";

/**
 * Hard-erases the account (SEC-22; a legal erasure skips the 30-day window, DB-13). One statement,
 * so it is atomic on neon-http: each table in `USER_TABLES` plus the user's `rate_limits` and reset
 * `verifications` is deleted in a CTE, and the `users` row last (its FKs cascade as a backstop).
 * Every step is guarded by the typed email matching the account's, compared case-insensitively;
 * on a mismatch nothing is deleted and this throws 400 `confirm_mismatch`. Deleting `sessions`
 * signs out every device at once (no cookie cache is configured).
 */
export async function eraseAccount(userId: string, confirmEmail: string): Promise<void> {
  const confirmed = sql`EXISTS (SELECT 1 FROM users WHERE id = ${userId} AND lower(email) = lower(${confirmEmail}))`;
  const steps = [
    ...USER_TABLES.map(
      (table) => sql`DELETE FROM ${sql.identifier(table)} WHERE user_id = ${userId} AND ${confirmed}`,
    ),
    sql`DELETE FROM verifications WHERE value = ${userId} AND ${confirmed}`,
    sql`DELETE FROM rate_limits WHERE right(bucket, ${userId.length + 1}::int) = ${`:${userId}`} AND ${confirmed}`,
  ];
  const ctes = sql.join(
    steps.map((step, index) => sql`${sql.identifier(`erase_${index}`)} AS (${step})`),
    sql`, `,
  );

  const result = await db().execute<{ id: string }>(sql`
    WITH ${ctes}
    DELETE FROM users WHERE id = ${userId} AND lower(email) = lower(${confirmEmail})
    RETURNING id`);
  if (result.rows.length === 0) {
    throw new HttpError(
      400,
      "confirm_mismatch",
      "That is not your account's email. Type it exactly to delete the account.",
    );
  }
}
