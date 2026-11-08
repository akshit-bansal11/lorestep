import { describe, expect, it } from "vitest";

import { clientIp } from "@/lib/http/client-ip";

const withHeader = (value?: string) =>
  clientIp(new Headers(value === undefined ? {} : { "x-forwarded-for": value }));

describe("clientIp", () => {
  it("returns the single address the proxy set", () => {
    expect(withHeader("203.0.113.7")).toBe("203.0.113.7");
    expect(withHeader(" 2001:db8::1 ")).toBe("2001:db8::1");
  });

  it("returns null when the header is missing, empty, a list or not an address", () => {
    for (const value of [undefined, "", "203.0.113.7, 10.0.0.1", "unknown", "203.0.113.999"]) {
      expect(withHeader(value)).toBeNull();
    }
  });

  it("ignores other client-settable headers", () => {
    expect(clientIp(new Headers({ "x-real-ip": "203.0.113.7" }))).toBeNull();
  });
});
