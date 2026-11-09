import { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HttpError } from "@/lib/http/http-error";
import { eraseAccount } from "@/services/account/erase";
import { USER_TABLES } from "@/services/account/user-tables";

// `execute` and `signOut` append to `calls`, so the test sees the order of the two steps.
const state = vi.hoisted(() => {
  const calls: unknown[] = [];
  const signOut = vi.fn();
  return { calls, signOut };
});

vi.mock("@/lib/db/client", () => ({
  db: () => ({
    execute: (query: unknown) => {
      state.calls.push(query);
      return Promise.resolve({ rows: [] });
    },
  }),
}));
vi.mock("@/lib/auth/neon-auth", () => ({ neonAuth: () => ({ signOut: state.signOut }) }));

const ACCOUNT = {
  userId: "0b7c2c0e-6c2f-4b8a-9d0e-1f2a3b4c5d6e",
  email: "A@Example.com",
  name: "A",
};

function firstQuery() {
  const query = state.calls[0];
  if (!(query instanceof SQL)) throw new Error("nothing executed");
  return new PgDialect().sqlToQuery(query);
}

async function statusOf(promise: Promise<unknown>) {
  const error = await promise.catch((caught: unknown) => caught);
  return error instanceof HttpError ? `${error.status} ${error.code}` : "resolved";
}

describe("eraseAccount", () => {
  beforeEach(() => {
    state.calls.length = 0;
    state.signOut.mockReset();
    state.signOut.mockImplementation(() => {
      state.calls.push("signOut");
      return Promise.resolve({ data: { success: true }, error: null });
    });
  });

  it("deletes all user rows and the Neon Auth user in one statement, then signs out", async () => {
    await eraseAccount(ACCOUNT, "a@example.com");
    const { sql, params } = firstQuery();

    expect(state.calls).toEqual([expect.any(SQL), "signOut"]);
    for (const table of USER_TABLES) {
      expect(sql).toMatch(new RegExp(`DELETE FROM "${table}" WHERE user_id = \$\d+::uuid`));
    }
    expect(sql).toMatch(/DELETE FROM rate_limits WHERE strpos\(bucket, \$\d+\) > 0\)/);
    expect(sql).toMatch(/DELETE FROM neon_auth\."user" WHERE id = \$\d+::uuid$/);
    // Every value is the caller's id or its bucket needle: never another user.
    expect(new Set(params)).toEqual(new Set([ACCOUNT.userId, `:${ACCOUNT.userId}:`]));
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
