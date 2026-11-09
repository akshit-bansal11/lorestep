import { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HttpError } from "@/lib/http/http-error";
import { eraseAccount, eraseStatement } from "@/services/account/erase";
import { USER_TABLES } from "@/services/account/user-tables";

// `execute` and `signOut` append to `calls`, so the test sees the order of the steps. Every
// `execute` answers `authRows`: the catalog query reads them, the erase statement ignores them.
const state = vi.hoisted(() => {
  const calls: unknown[] = [];
  const authRows: { table_name: string; column_name: string }[] = [];
  const signOut = vi.fn();
  return { calls, authRows, signOut };
});

vi.mock("@/lib/db/client", () => ({
  db: () => ({
    execute: (query: unknown) => {
      state.calls.push(query);
      return Promise.resolve({ rows: state.authRows });
    },
  }),
}));
vi.mock("@/lib/auth/neon-auth", () => ({ neonAuth: () => ({ signOut: state.signOut }) }));

const ACCOUNT = {
  userId: "0b7c2c0e-6c2f-4b8a-9d0e-1f2a3b4c5d6e",
  email: "A@Example.com",
  name: "A",
};

function render(query: unknown) {
  if (!(query instanceof SQL)) throw new Error("not a query");
  return new PgDialect().sqlToQuery(query);
}

async function statusOf(promise: Promise<unknown>) {
  const error = await promise.catch((caught: unknown) => caught);
  return error instanceof HttpError ? `${error.status} ${error.code}` : "resolved";
}

describe("eraseStatement", () => {
  it("deletes every user table, the user's limiter rows and the Neon Auth user", () => {
    const { sql, params } = render(eraseStatement(ACCOUNT.userId, []));

    for (const table of USER_TABLES) {
      // Doubled backslashes: inside a template literal `\$` and `\d` lose theirs, so `\\$\\d+`
      // is what reaches RegExp as `\$\d+`.
      expect(sql).toMatch(new RegExp(`DELETE FROM "${table}" WHERE user_id = \\$\\d+::uuid`));
    }
    expect(sql).toMatch(/DELETE FROM rate_limits WHERE strpos\(bucket, \$\d+\) > 0\)/);
    expect(sql).toMatch(/DELETE FROM neon_auth\."user" WHERE id = \$\d+::uuid$/);
    expect(sql).not.toContain("erase_auth_");
    // Every value is the caller's id or its bucket needle: never another user.
    expect(new Set(params)).toEqual(new Set([ACCOUNT.userId, `:${ACCOUNT.userId}:`]));
  });

  it("also deletes the user's rows from each non-cascading auth table, identifiers quoted", () => {
    const { sql, params } = render(
      eraseStatement(ACCOUNT.userId, [
        { table_name: "oauthAccessToken", column_name: "userId" },
        { table_name: "oauth_consent", column_name: "user_id" },
        { table_name: 'evil"; DROP TABLE entries; --', column_name: "userId" },
      ]),
    );

    expect(sql).toContain(
      `"erase_auth_0" AS (DELETE FROM neon_auth."oauthAccessToken" WHERE "userId"::text = $`,
    );
    expect(sql).toContain(
      `"erase_auth_1" AS (DELETE FROM neon_auth."oauth_consent" WHERE "user_id"::text = $`,
    );
    // A hostile catalog name stays one quoted identifier, its quote doubled.
    expect(sql).toContain(`DELETE FROM neon_auth."evil""; DROP TABLE entries; --" WHERE`);
    expect(sql).toMatch(/DELETE FROM neon_auth\."user" WHERE id = \$\d+::uuid$/);
    expect(new Set(params)).toEqual(new Set([ACCOUNT.userId, `:${ACCOUNT.userId}:`]));
  });
});

describe("eraseAccount", () => {
  beforeEach(() => {
    state.calls.length = 0;
    state.authRows.length = 0;
    state.signOut.mockReset();
    state.signOut.mockImplementation(() => {
      state.calls.push("signOut");
      return Promise.resolve({ data: { success: true }, error: null });
    });
  });

  it("reads the non-cascading auth tables, erases in one statement, then signs out", async () => {
    state.authRows.push({ table_name: "oauthConsent", column_name: "userId" });
    await eraseAccount(ACCOUNT, "a@example.com");

    expect(state.calls).toEqual([expect.any(SQL), expect.any(SQL), "signOut"]);
    const catalog = render(state.calls[0]);
    expect(catalog.sql).toContain("information_schema.columns");
    expect(catalog.sql).toContain("k.confdeltype = 'c'");
    expect(catalog.params).toEqual([]);
    const erase = render(state.calls[1]);
    expect(erase.sql).toContain(`DELETE FROM neon_auth."oauthConsent" WHERE "userId"::text = $`);
    expect(erase.sql).toMatch(/DELETE FROM neon_auth\."user" WHERE id = \$\d+::uuid$/);
  });

  it("throws 400 confirm_mismatch on a wrong email and deletes nothing", async () => {
    expect(await statusOf(eraseAccount(ACCOUNT, "b@example.com"))).toBe("400 confirm_mismatch");
    expect(state.calls).toHaveLength(0);
    expect(state.signOut).not.toHaveBeenCalled();
  });

  it("still resolves when sign-out fails or throws, since the user row is already gone", async () => {
    state.signOut.mockResolvedValueOnce({
      data: null,
      error: { message: "no session", status: 400, statusText: "", code: "X" },
    });
    expect(await statusOf(eraseAccount(ACCOUNT, "a@example.com"))).toBe("resolved");

    state.signOut.mockRejectedValueOnce(new Error("network"));
    expect(await statusOf(eraseAccount(ACCOUNT, "a@example.com"))).toBe("resolved");
  });
});
