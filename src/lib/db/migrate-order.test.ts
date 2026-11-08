import { describe, expect, it } from "vitest";

import {
  downFileFor,
  isLocalDatabase,
  orderMigrations,
  pendingMigrations,
} from "@/lib/db/migrate-order";

describe("orderMigrations", () => {
  it("returns up files in filename order and leaves down files out", () => {
    const files = [
      "0001_auth.sql",
      "0000_schema_migrations.down.sql",
      "0001_auth.down.sql",
      "0000_schema_migrations.sql",
    ];
    expect(orderMigrations(files)).toEqual(["0000_schema_migrations.sql", "0001_auth.sql"]);
  });

  it("rejects an up file without its down file", () => {
    expect(() => orderMigrations(["0000_init.sql"])).toThrow("0000_init.down.sql");
  });

  it("rejects a down file without its up file", () => {
    expect(() => orderMigrations(["0000_init.down.sql"])).toThrow("has no up migration");
  });

  const badNames = ["1_init.sql", "0000-init.sql", "0000_Init.sql", "0000_init.SQL", "README.md"];

  it.each(badNames)("rejects the badly named file %s", (file) => {
    expect(() => orderMigrations([file])).toThrow("is not named");
  });
});

describe("pendingMigrations", () => {
  const ordered = ["0000_a.sql", "0001_b.sql", "0002_c.sql"];

  it("keeps order and drops what is applied", () => {
    expect(pendingMigrations(ordered, new Set(["0000_a.sql"]))).toEqual([
      "0001_b.sql",
      "0002_c.sql",
    ]);
  });

  it("is empty once everything is applied, so a second run applies nothing", () => {
    expect(pendingMigrations(ordered, new Set(ordered))).toEqual([]);
  });
});

describe("downFileFor", () => {
  it("swaps the extension", () => {
    expect(downFileFor("0001_auth.sql")).toBe("0001_auth.down.sql");
  });
});

describe("isLocalDatabase", () => {
  it.each([
    ["postgres://u:p@localhost:5432/db", true],
    ["postgres://u:p@127.0.0.1/db", true],
    ["postgres://u:p@[::1]:5432/db", true],
    ["postgres://u:p@ep-x.eu-central-1.aws.neon.tech/db?sslmode=require", false],
    ["postgres://u:p@localhost.evil.example/db", false],
  ])("%s -> %s", (url, local) => {
    expect(isLocalDatabase(url)).toBe(local);
  });
});
