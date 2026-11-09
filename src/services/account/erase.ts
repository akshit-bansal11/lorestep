import { type SQL, sql } from "drizzle-orm";

import { neonAuth } from "@/lib/auth/neon-auth";
import { db } from "@/lib/db/client";
import { userBucketNeedle } from "@/lib/db/rate-limit";
import { HttpError } from "@/lib/http/http-error";
import { USER_TABLES } from "@/services/account/user-tables";
import type { NeonAuthUserTable } from "@/types/account/account";
import type { SessionAccount } from "@/types/auth/auth";

/**
 * Every `neon_auth` base table with a `userId` or `user_id` column whose FK to `neon_auth."user"`
 * on that column is missing or not `ON DELETE CASCADE` (session, account and member cascade
 * today; the OAuth token and consent tables may not). Read from the catalog at erase time, so a
 * table Neon adds later is covered without a code change. `scripts/migrate.mjs` prints the same
 * list with every delete rule.
 */
const NON_CASCADING_AUTH_TABLES = sql`
  SELECT c.table_name, c.column_name
  FROM information_schema.columns c
  JOIN information_schema.tables t
    ON t.table_schema = c.table_schema AND t.table_name = c.table_name
  WHERE c.table_schema = 'neon_auth' AND t.table_type = 'BASE TABLE'
    AND c.column_name IN ('userId', 'user_id')
    AND NOT EXISTS (
      SELECT 1 FROM pg_constraint k
      JOIN pg_attribute a ON a.attrelid = k.conrelid AND a.attnum = ANY (k.conkey)
      WHERE k.contype = 'f' AND k.confdeltype = 'c'
        AND k.confrelid = 'neon_auth."user"'::regclass
        AND k.conrelid = format('%I.%I', c.table_schema, c.table_name)::regclass
        AND a.attname = c.column_name)
  ORDER BY c.table_name`;

/**
 * The one erase statement: every `USER_TABLES` table, every `authTables` row of the user (each
 * identifier quoted by `sql.identifier`, the id compared as text so a text or uuid column both
 * match), the user's `rate_limits`, and the `neon_auth."user"` row itself.
 */
export function eraseStatement(userId: string, authTables: readonly NeonAuthUserTable[]): SQL {
  const ctes = [
    ...USER_TABLES.map(
      (table, index) =>
        sql`${sql.identifier(`erase_${index}`)} AS (DELETE FROM ${sql.identifier(table)} WHERE user_id = ${userId}::uuid)`,
    ),
    ...authTables.map(
      ({ table_name, column_name }, index) =>
        sql`${sql.identifier(`erase_auth_${index}`)} AS (DELETE FROM neon_auth.${sql.identifier(table_name)} WHERE ${sql.identifier(column_name)}::text = ${userId})`,
    ),
  ];
  return sql`
    WITH ${sql.join(ctes, sql`, `)},
    erase_limits AS (DELETE FROM rate_limits WHERE strpos(bucket, ${userBucketNeedle(userId)}) > 0)
    DELETE FROM neon_auth."user" WHERE id = ${userId}::uuid`;
}

/**
 * Hard-erases the account (SEC-22; a legal erasure skips the 30-day window, DB-13), in this order
 * (PLAN.md section 12, N-10):
 * 1. The typed email must match the session's, case-insensitively; else 400 `confirm_mismatch`
 *    and nothing is touched.
 * 2. A read-only catalog query lists the `neon_auth` tables holding user rows that would not
 *    cascade (`NON_CASCADING_AUTH_TABLES`), so OAuth grants and tokens cannot outlive the user.
 * 3. One statement (`eraseStatement`), atomic on neon-http: user data, those auth rows, the
 *    user's `rate_limits`, and the `neon_auth."user"` row itself. Neon's `deleteUser()` is
 *    disabled (Better Auth answers 404 while `user.deleteUser.enabled` is off, and Neon exposes no
 *    setting), so the row is deleted here (DECISIONS.md). Cascading tables go with it. Data and
 *    identity go together or not at all.
 * 4. `signOut()` clears the caller's cookies, best-effort: the session row is already gone, so a
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

  const authTables = await db().execute<NeonAuthUserTable>(NON_CASCADING_AUTH_TABLES);
  await db().execute(eraseStatement(account.userId, authTables.rows));

  try {
    const result = await neonAuth().signOut();
    if (result.error) console.warn("sign-out after erase failed", result.error.status);
  } catch (error) {
    console.warn("sign-out after erase threw", error instanceof Error ? error.name : typeof error);
  }
}
