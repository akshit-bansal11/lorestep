import { describe, expect, it } from "vitest";

import { decodeCursor, encodeCursor, isCursorInstant } from "@/utils/log/entry-cursor";

const ID = "00000000-0000-4000-8000-000000000001";

describe("isCursorInstant", () => {
  it("accepts what Postgres prints for a timestamptz", () => {
    for (const at of [
      "2026-11-08 10:00:00.123456+00",
      "2026-11-08 10:00:00+05:30",
      "2024-02-29T23:59:59Z",
    ]) {
      expect(isCursorInstant(at)).toBe(true);
    }
  });

  it("refuses the right shape that is not a real instant", () => {
    for (const at of [
      "2026-99-99 10:00:00+00",
      "2026-02-31 10:00:00+00",
      "2025-02-29 10:00:00+00",
      "2026-11-08 24:00:00+00",
      "2026-11-08 10:61:00+00",
      "0000-01-01 00:00:00+00",
      "2026-11-08 10:00:00+16",
      "2026-11-08 10:00:00+05:60",
    ]) {
      expect(isCursorInstant(at)).toBe(false);
    }
  });
});

describe("decodeCursor", () => {
  it("round-trips a minted cursor", () => {
    const at = "2026-11-08 10:00:00.123456+00";
    expect(decodeCursor(encodeCursor({ at, id: ID }))).toEqual({ at, id: ID });
  });

  it("returns null for a well-shaped cursor whose date is not real", () => {
    expect(decodeCursor(encodeCursor({ at: "2026-99-99 10:00:00+00", id: ID }))).toBeNull();
  });
});
