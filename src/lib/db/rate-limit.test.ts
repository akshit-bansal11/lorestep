import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  bucketKey,
  rateLimit,
  retryAfterFor,
  userBucketNeedle,
  windowStartFor,
} from "@/lib/db/rate-limit";

const { returning, values, onConflictDoUpdate } = vi.hoisted(() => ({
  returning: vi.fn(),
  values: vi.fn(),
  onConflictDoUpdate: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  db: () => ({
    insert: () => ({
      values: (row: unknown) => {
        values(row);
        return {
          onConflictDoUpdate: (config: unknown) => {
            onConflictDoUpdate(config);
            return { returning };
          },
        };
      },
    }),
  }),
}));

// 2026-11-08T00:00:30.250Z: 30.25 s into a minute.
const NOW = Date.UTC(2026, 10, 8, 0, 0, 30, 250);
const MINUTE_START = Date.UTC(2026, 10, 8) / 1000;

describe("window math", () => {
  it("aligns the window start to a multiple of the window", () => {
    expect(windowStartFor(NOW, 60)).toBe(MINUTE_START);
    expect(windowStartFor(NOW, 10)).toBe(MINUTE_START + 30);
    expect(windowStartFor(MINUTE_START * 1000, 60)).toBe(MINUTE_START);
  });

  it("gives whole seconds until the window closes, never 0", () => {
    expect(retryAfterFor(NOW, 60)).toBe(29);
    expect(retryAfterFor(MINUTE_START * 1000 + 59_999, 60)).toBe(1);
  });
});

describe("rateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("counts into a bucket keyed by name and window, and allows up to the limit", async () => {
    returning.mockResolvedValueOnce([{ count: 3 }]);

    await expect(rateLimit("ip:203.0.113.7", 3, 60, NOW)).resolves.toEqual({
      allowed: true,
      retryAfterSec: 29,
    });
    expect(values).toHaveBeenCalledWith({
      bucket: "ip:203.0.113.7:60",
      windowStart: MINUTE_START,
      count: 1,
    });
    expect(onConflictDoUpdate).toHaveBeenCalledOnce();
  });

  it("denies once the count passes the limit", async () => {
    returning.mockResolvedValueOnce([{ count: 4 }]);

    await expect(rateLimit("ip:203.0.113.7", 3, 60, NOW)).resolves.toMatchObject({
      allowed: false,
    });
  });

  it("fails open when the store is unreachable", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    returning.mockRejectedValueOnce(new Error("connection refused"));

    await expect(rateLimit("ip:203.0.113.7", 3, 60, NOW)).resolves.toMatchObject({
      allowed: true,
    });
    expect(warn).toHaveBeenCalledOnce();
  });
});

describe("userBucketNeedle", () => {
  const prefixes = ["account", "export", "meta", "resolve", "search", "sync-pull", "sync-push"];

  it("is found in every stored bucket keyed by the user, whatever the window", () => {
    for (const prefix of prefixes) {
      for (const windowSec of [1, 60, 3600]) {
        expect(bucketKey(`${prefix}:user-a`, windowSec)).toContain(userBucketNeedle("user-a"));
      }
    }
  });

  it("never matches another user's bucket or an IP bucket", () => {
    for (const bucket of ["account:user-ab", "account:xuser-a", "ip:203.0.113.7"]) {
      expect(bucketKey(bucket, 60)).not.toContain(userBucketNeedle("user-a"));
    }
  });
});
