import { beforeEach, describe, expect, it, vi } from "vitest";

import { canonicalAuthPath, withAuthLimit } from "@/lib/http/with-auth-limit";

const { rateLimit } = vi.hoisted(() => ({ rateLimit: vi.fn() }));

vi.mock("@/lib/db/rate-limit", () => ({ rateLimit }));

const handler = vi.fn(() => Promise.resolve(new Response("proxied")));
const limited = withAuthLimit(handler);

const IP = { "x-forwarded-for": "1.2.3.4" };

const call = (path: string, headers: Record<string, string> = IP, method = "POST") =>
  limited(new Request(`https://lorestep.test/api/auth${path}`, { method, headers }), {
    params: Promise.resolve({ path: path.split("/").filter(Boolean) }),
  });

const buckets = () => rateLimit.mock.calls.map((args: unknown[]) => args[0]);

describe("canonicalAuthPath", () => {
  it("lowercases, decodes and drops empty segments", () => {
    const spellings = ["/sign-in/email", "/Sign-In/email", "//sign-in//email/", "/sign%2Din/EMAIL"];
    for (const path of spellings) {
      expect(canonicalAuthPath(`https://lorestep.test/api/auth${path}`)).toBe("sign-in/email");
    }
  });
});

describe("withAuthLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rateLimit.mockResolvedValue({ allowed: true, retryAfterSec: 30 });
  });

  it("counts a credential POST in the default and its own per-path bucket, then proxies", async () => {
    expect(await (await call("/sign-in/email")).text()).toBe("proxied");

    expect(rateLimit.mock.calls).toEqual([
      ["auth:1.2.3.4", 30, 60],
      ["auth:sign-in/email:1.2.3.4", 10, 60],
    ]);
  });

  it("puts every spelling of a credential path in the same bucket", async () => {
    for (const path of ["/Sign-In/email", "//sign-in/email", "/sign-in/email/"]) {
      await call(path);
    }
    expect(buckets().filter((bucket) => bucket !== "auth:1.2.3.4")).toEqual([
      "auth:sign-in/email:1.2.3.4",
      "auth:sign-in/email:1.2.3.4",
      "auth:sign-in/email:1.2.3.4",
    ]);
  });

  it("applies the default bucket to an unlisted POST path", async () => {
    await call("/sign-out");
    await call("/oauth2/consent");

    expect(buckets()).toEqual(["auth:1.2.3.4", "auth:1.2.3.4"]);
  });

  it("answers 429 with Retry-After past either cap and never proxies", async () => {
    rateLimit.mockResolvedValueOnce({ allowed: false, retryAfterSec: 42 });
    const overDefault = await call("/sign-out");
    expect(overDefault.status).toBe(429);
    expect(overDefault.headers.get("retry-after")).toBe("42");

    rateLimit
      .mockResolvedValueOnce({ allowed: true, retryAfterSec: 30 })
      .mockResolvedValueOnce({ allowed: false, retryAfterSec: 7 });
    expect((await call("/reset-password")).status).toBe(429);
    expect(handler).not.toHaveBeenCalled();
  });

  it("answers 403 when the client IP cannot be resolved", async () => {
    const response = await call("/sign-up/email", {});

    expect(response.status).toBe(403);
    expect(rateLimit).not.toHaveBeenCalled();
    expect(handler).not.toHaveBeenCalled();
  });

  it("does not limit GET", async () => {
    expect(await (await call("/get-session", {}, "GET")).text()).toBe("proxied");
    expect(rateLimit).not.toHaveBeenCalled();
  });
});
