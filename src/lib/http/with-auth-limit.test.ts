import { beforeEach, describe, expect, it, vi } from "vitest";

import { HttpError } from "@/lib/http/http-error";
import { canonicalAuthPath, withAuthLimit } from "@/lib/http/with-auth-limit";

const { rateLimit } = vi.hoisted(() => ({ rateLimit: vi.fn() }));

vi.mock("@/lib/db/rate-limit", () => ({ rateLimit }));

const handler = vi.fn(() => Promise.resolve(new Response("proxied")));
const limited = withAuthLimit(handler);

const IP = { "x-forwarded-for": "1.2.3.4" };

// `path` is the forwarded `params.path`; the URL is deliberately unrelated, since it is not read.
const call = (path: string[], headers: Record<string, string> = IP, method = "POST") =>
  limited(new Request("https://lorestep.test/api/auth/x", { method, headers }), {
    params: Promise.resolve({ path }),
  });

const buckets = () => rateLimit.mock.calls.map((args: unknown[]) => args[0]);

describe("canonicalAuthPath", () => {
  it("decodes and lowercases each forwarded segment", () => {
    expect(canonicalAuthPath(["Sign-In", "EMAIL"])).toBe("sign-in/email");
    expect(canonicalAuthPath(["sign%2Din", "email"])).toBe("sign-in/email");
  });

  it("rejects empty, dot, undecodable and slash, backslash or percent segments", () => {
    for (const path of [
      [],
      ["sign-in", ""],
      ["."],
      ["sign-in", ".."],
      ["%E0%A4%A"],
      ["sign-in%2Femail"],
      ["sign-in%5Cemail"],
      ["sign-in%252Femail"],
    ]) {
      expect(() => canonicalAuthPath(path)).toThrow(HttpError);
    }
  });
});

describe("withAuthLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rateLimit.mockResolvedValue({ allowed: true, retryAfterSec: 30 });
  });

  it("counts a credential POST in the default and its strict bucket, then proxies", async () => {
    expect(await (await call(["sign-in", "email"])).text()).toBe("proxied");

    expect(rateLimit.mock.calls).toEqual([
      ["auth:1.2.3.4", 30, 60],
      ["auth:sign-in/email:1.2.3.4", 10, 60],
    ]);
  });

  it("puts every spelling of a path in the same strict bucket", async () => {
    await call(["Sign-In", "email"]);
    await call(["sign%2Din", "EMAIL"]);

    expect(buckets()).toEqual([
      "auth:1.2.3.4",
      "auth:sign-in/email:1.2.3.4",
      "auth:1.2.3.4",
      "auth:sign-in/email:1.2.3.4",
    ]);
  });

  it("puts an unknown POST path in the strict bucket too (fail closed)", async () => {
    await call(["some", "new-endpoint"]);

    expect(buckets()).toEqual(["auth:1.2.3.4", "auth:some/new-endpoint:1.2.3.4"]);
  });

  it("gives only the allowlisted non-credential paths the default bucket alone", async () => {
    await call(["sign-out"]);
    await call(["OAuth2", "consent"]);

    expect(buckets()).toEqual(["auth:1.2.3.4", "auth:1.2.3.4"]);
  });

  it("answers 400 for a malformed path, counting and proxying nothing", async () => {
    const response = await call(["sign-in", "..", "email"]);

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("invalid_path");
    expect(rateLimit).not.toHaveBeenCalled();
    expect(handler).not.toHaveBeenCalled();
  });

  it("answers 429 with Retry-After past either cap and never proxies", async () => {
    rateLimit.mockResolvedValueOnce({ allowed: false, retryAfterSec: 42 });
    const overDefault = await call(["sign-out"]);
    expect(overDefault.status).toBe(429);
    expect(overDefault.headers.get("retry-after")).toBe("42");

    rateLimit
      .mockResolvedValueOnce({ allowed: true, retryAfterSec: 30 })
      .mockResolvedValueOnce({ allowed: false, retryAfterSec: 7 });
    expect((await call(["reset-password"])).status).toBe(429);
    expect(handler).not.toHaveBeenCalled();
  });

  it("answers 403 when the client IP cannot be resolved", async () => {
    const response = await call(["sign-up", "email"], {});

    expect(response.status).toBe(403);
    expect(rateLimit).not.toHaveBeenCalled();
    expect(handler).not.toHaveBeenCalled();
  });

  it("does not limit GET", async () => {
    expect(await (await call(["get-session"], {}, "GET")).text()).toBe("proxied");
    expect(rateLimit).not.toHaveBeenCalled();
  });
});
