import { describe, expect, it } from "vitest";
import { initials } from "@/utils/auth/initials";

describe("initials", () => {
  it("uses first and last name", () => {
    expect(initials("Ada Lovelace King", "a@b.co")).toBe("AK");
    expect(initials("ada", "a@b.co")).toBe("A");
  });

  it("falls back to the email, then a placeholder", () => {
    expect(initials("  ", "zed@b.co")).toBe("Z");
    expect(initials("", "")).toBe("?");
  });
});
