import { sql } from "drizzle-orm";

import { neonAuth } from "@/lib/auth/neon-auth";
import { neonData } from "@/lib/auth/neon-result";
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
 * 2. One statement, atomic on neon-http: every `USER_TABLES` table and the user's `rate_limits`.
 * 3. Neon Auth `deleteUser()`, which removes the user, its sessions and credentials. If it fails
 *    the data is already gone: 502 `erase_incomplete`, and a retry is safe (step 2 is idempotent).
 * The FK cascade from `neon_auth."user"` stays the backstop if a user is deleted in the Console.
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
    WITH ${ctes}
    DELETE FROM rate_limits WHERE strpos(bucket, ${userBucketNeedle(account.userId)}) > 0`);

  try {
    neonData(await neonAuth().deleteUser({}));
  } catch {
    throw new HttpError(
      502,
      "erase_incomplete",
      "Your data was deleted, but your sign-in could not be removed. Try again.",
    );
  }
}
