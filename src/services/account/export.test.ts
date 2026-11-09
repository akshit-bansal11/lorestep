import { beforeEach, describe, expect, it, vi } from "vitest";

import { entries, entryLinks, listItems, lists } from "@/lib/db/schema";
import { exportAccount } from "@/services/account/export";

// `from(table)` records its table; `batch` answers `state.batch`.
const state = vi.hoisted(() => {
  const tables: unknown[] = [];
  const batch: unknown[] = [];
  return { tables, batch };
});

vi.mock("@/lib/db/client", () => ({
  db: () => ({
    select: () => ({
      from: (table: unknown) => {
        state.tables.push(table);
        return { where: () => ({}) };
      },
    }),
    batch: () => Promise.resolve(state.batch),
  }),
}));

const ACCOUNT = { userId: "user-a", name: "A", email: "a@example.com" };

describe("exportAccount", () => {
  beforeEach(() => {
    state.tables.length = 0;
    state.batch = [[{ id: "e1" }], [{ entryId: "e1" }], [{ id: "l1" }], [{ id: "i1" }]];
  });

  it("returns the session profile and every owned row under fixed keys", async () => {
    const data = await exportAccount(ACCOUNT);

    expect(Object.keys(data)).toEqual([
      "exportedAt",
      "profile",
      "entries",
      "entryLinks",
      "lists",
      "listItems",
    ]);
    expect(data).toMatchObject({
      profile: { id: "user-a", name: "A", email: "a@example.com" },
      entries: [{ id: "e1" }],
      entryLinks: [{ entryId: "e1" }],
      lists: [{ id: "l1" }],
      listItems: [{ id: "i1" }],
    });
    expect(Number.isNaN(Date.parse(data.exportedAt))).toBe(false);
  });

  it("reads only the four user tables and carries no credential key", async () => {
    const data = await exportAccount(ACCOUNT);

    expect(state.tables).toEqual([entries, entryLinks, lists, listItems]);
    expect(Object.keys(data.profile)).toEqual(["id", "name", "email"]);
    expect(JSON.stringify(data)).not.toMatch(/token|password|secret/i);
  });
});
