import { describe, expect, it } from "vitest";

import { formatDate } from "@/utils/log/format-date";

describe("formatDate", () => {
  it("formats an instant as a short date", () => {
    const out = formatDate("2026-11-10T12:00:00.000Z");
    expect(out).toContain("2026");
    expect(out).toContain("10");
  });

  it("returns empty for null and for garbage", () => {
    expect(formatDate(null)).toBe("");
    expect(formatDate("nope")).toBe("");
  });
});
