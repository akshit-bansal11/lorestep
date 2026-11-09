import { describe, expect, it } from "vitest";

import { clientIp } from "@/lib/http/client-ip";

const withHeader = (value?: string) =>
  clientIp(new Headers(value === undefined ? {} : { "x-forwarded-for": value }));

describe("clientIp", () => {
  it("returns the single IPv4 address the proxy set", () => {
    expect(withHeader("203.0.113.7")).toBe("203.0.113.7");
    expect(withHeader(" 203.0.113.7 ")).toBe("203.0.113.7");
  });

  it("keys IPv6 by its /64, the same for every spelling of it", () => {
    for (const value of [
      " 2001:db8::1 ",
      "2001:db8:0:0:ffff:ffff:ffff:ffff",
      "2001:0DB8:0000:0000::abcd",
      "2001:db8::",
      "2001:db8::1%eth0",
      "2001:db8:0:0:1:2:3.4.5.6",
    ]) {
      expect(withHeader(value)).toBe("2001:db8:0:0::/64");
    }
    expect(withHeader("2001:db8:0:1::1")).toBe("2001:db8:0:1::/64");
    expect(withHeader("::1")).toBe("0:0:0:0::/64");
    expect(withHeader("fe80::1:2:3:4")).toBe("fe80:0:0:0::/64");
    expect(withHeader("1:2:3:4:5::")).toBe("1:2:3:4::/64");
  });

  it("keys an IPv4-mapped IPv6 address by the IPv4 address", () => {
    expect(withHeader("::ffff:203.0.113.7")).toBe("203.0.113.7");
    expect(withHeader("::FFFF:203.0.113.7")).toBe("203.0.113.7");
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
