import { beforeEach, describe, expect, it, vi } from "vitest";

import { entries, entryLinks, listItems, lists, users } from "@/lib/db/schema";
import { exportAccount } from "@/services/account/export";

// `select(fields)` records its columns and `from(table)` its table; `batch` answers `state.batch`.
const state = vi.hoisted(() => {
  const fields: unknown[] = [];
  const tables: unknown[] = [];
  const batch: unknown[] = [];
  return { fields, tables, batch };
});

vi.mock("@/lib/db/client", () => ({
  db: () => ({
    select: (fields?: unknown) => {
      state.fields.push(fields);
      return {
        from: (table: unknown) => {
          state.tables.push(table);
          return { where: () => ({}) };
        },
      };
    },
    batch: () => Promise.resolve(state.batch),
  }),
}));

const PROFILE = { id: "user-a", name: "A", email: "a@example.com" };

describe("exportAccount", () => {
  beforeEach(() => {
    state.fields.length = 0;
    state.tables.length = 0;
    state.batch = [[PROFILE], [{ id: "e1" }], [{ entryId: "e1" }], [{ id: "l1" }], [{ id: "i1" }]];
  });

  it("returns the profile and every owned row under fixed keys", async () => {
    const data = await exportAccount("user-a");

    expect(Object.keys(data)).toEqual([
      "exportedAt",
      "profile",
      "entries",
      "entryLinks",
      "lists",
      "listItems",
    ]);
    expect(data).toMatchObject({
      profile: PROFILE,
      entries: [{ id: "e1" }],
      entryLinks: [{ entryId: "e1" }],
      lists: [{ id: "l1" }],
      listItems: [{ id: "i1" }],
    });
    expect(Number.isNaN(Date.parse(data.exportedAt))).toBe(false);
  });

  it("reads no credential table and no token or password column", async () => {
    await exportAccount("user-a");

    expect(state.tables).toEqual([users, entries, entryLinks, lists, listItems]);
    const profileColumns = Object.keys(Object(state.fields[0]));
    expect(profileColumns).toEqual(["id", "name", "email", "emailVerified", "image", "createdAt"]);
    expect(profileColumns.join()).not.toMatch(/token|password/i);
  });

  it("answers a null profile when the user row is gone", async () => {
    state.batch = [[], [], [], [], []];
    expect((await exportAccount("user-a")).profile).toBeNull();
  });
});
