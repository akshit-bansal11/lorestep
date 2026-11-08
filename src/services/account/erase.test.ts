import { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HttpError } from "@/lib/http/http-error";
import { eraseAccount } from "@/services/account/erase";
import { USER_TABLES } from "@/services/account/user-tables";

// `execute` records its SQL and answers `state.rows` (the ids RETURNING would hand back).
const state = vi.hoisted(() => {
  const executed: unknown[] = [];
  const rows: unknown[] = [];
  return { executed, rows };
});

vi.mock("@/lib/db/client", () => ({
  db: () => ({
    execute: (query: unknown) => {
      state.executed.push(query);
      return Promise.resolve({ rows: state.rows });
    },
  }),
}));

const USER = "user-a";
const EMAIL = "a@example.com";

function lastQuery() {
  const query = state.executed.at(-1);
  if (!(query instanceof SQL)) throw new Error("nothing executed");
  return new PgDialect().sqlToQuery(query);
}

describe("eraseAccount", () => {
  beforeEach(() => {
    state.executed.length = 0;
    state.rows = [{ id: USER }];
  });

  it("deletes from every user table, then the user, in one statement", async () => {
    await eraseAccount(USER, EMAIL);
    const { sql, params } = lastQuery();

    expect(state.executed).toHaveLength(1);
    for (const table of USER_TABLES) {
      expect(sql).toMatch(new RegExp(`DELETE FROM "${table}" WHERE user_id = \\$\\d+ AND EXISTS`));
    }
    expect(sql).toContain("DELETE FROM verifications WHERE value = $");
    expect(sql).toContain("DELETE FROM rate_limits WHERE right(bucket, $");
    expect(sql).toMatch(
      /DELETE FROM users WHERE id = \$\d+ AND lower\(email\) = lower\(\$\d+\)\s+RETURNING id$/,
    );
    expect(params).toContain(`:${USER}`);
    // Every value is the caller's id, the typed email or the suffix length: never another user.
    expect(new Set(params)).toEqual(new Set([USER, EMAIL, `:${USER}`, USER.length + 1]));
  });

  it("guards every delete on the typed email matching the account", async () => {
    await eraseAccount(USER, EMAIL);
    const { sql } = lastQuery();
    const guards = sql.match(/EXISTS \(SELECT 1 FROM users WHERE id = \$\d+ AND lower\(email\)/g);

    expect(guards).toHaveLength(USER_TABLES.length + 2);
  });

  it("throws 400 confirm_mismatch when the email does not match (nothing deleted)", async () => {
    state.rows = [];

    const error = await eraseAccount(USER, "wrong@example.com").catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(HttpError);
    expect(error).toMatchObject({ status: 400, code: "confirm_mismatch" });
  });
});
