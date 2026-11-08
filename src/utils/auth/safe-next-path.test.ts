import { describe, expect, it } from "vitest";

import { safeNextPath } from "@/utils/auth/safe-next-path";

describe("safeNextPath", () => {
  it.each(["/library", "/lists/abc?x=1#top", "/"])("keeps the relative path %s", (path) => {
    expect(safeNextPath(path)).toBe(path);
  });

  it.each([
    null,
    undefined,
    "",
    "library",
    "https://evil.test",
    "http://evil.test/a",
    "//evil.test",
    "///evil.test",
    "/\evil.test",
    "\\evil.test",
    "javascript:alert(1)",
    "/\t/evil.test",
    "/\n/evil.test",
    "/\u0000x",
  ])("falls back to / for %j", (value) => {
    expect(safeNextPath(value)).toBe("/");
  });
});
