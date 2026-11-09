import { sql } from "drizzle-orm";

import { neonAuth } from "@/lib/auth/neon-auth";
import { db } from "@/lib/db/client";
import { userBucketNeedle } from "@/lib/db/rate-limit";
import { HttpError } from "@/lib/http/http-error";
import { USER_TABLES } from "@/services/account/user-tables";
import type { SessionAccount } from "@/types/auth/auth";

/**
 * Hard-erases the account (SEC-22; a legal erasure skips the 30-day window, DB-13), in this order
 * (PLAN.md section 12, N-10):
 * 1. The typed email must match the session's, case-insensitively; else 400 `confirm_mismatch`
 *    and nothing is touched.
 * 2. One statement, atomic on neon-http: every `USER_TABLES` table, the user's `rate_limits`, and
 *    the `neon_auth."user"` row itself. Neon's `deleteUser()` is disabled (Better Auth answers 404
 *    while `user.deleteUser.enabled` is off, and Neon exposes no setting), so the row is deleted
 *    here (DECISIONS.md). Its sessions and accounts go by `ON DELETE CASCADE`, which
 *    `scripts/migrate.mjs` asserts on every run. Data and identity go together or not at all.
 * 3. `signOut()` clears the caller's cookies, best-effort: the session row is already gone, so a
 *    failure only leaves a cookie that no longer signs anyone in.
 */
export async function eraseAccount(account: SessionAccount, confirmEmail: string): Promise<void> {
  if (account.email.toLowerCase() !== confirmEmail.toLowerCase()) {
    throw new HttpError(
      400,
      "confirm_mismatch",
      "That is not your account's email. Type it exactly to delete the account.",
    );
  }

  const ctes = sql.join(
    USER_TABLES.map(
      (table, index) =>
        sql`${sql.identifier(`erase_${index}`)} AS (DELETE FROM ${sql.identifier(table)} WHERE user_id = ${account.userId}::uuid)`,
    ),
    sql`, `,
  );
  await db().execute(sql`
    WITH ${ctes},
    erase_limits AS (DELETE FROM rate_limits WHERE strpos(bucket, ${userBucketNeedle(account.userId)}) > 0)
    DELETE FROM neon_auth."user" WHERE id = ${account.userId}::uuid`);

  try {
    const result = await neonAuth().signOut();
    if (result.error) console.warn("sign-out after erase failed", result.error.status);
  } catch (error) {
    console.warn("sign-out after erase threw", error instanceof Error ? error.name : typeof error);
  }
}
