import { createHash } from "node:crypto";

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

const post = (path: string[], body: string) =>
  limited(new Request("https://lorestep.test/api/auth/x", { method: "POST", headers: IP, body }), {
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

  it("answers 404 off the allowlist, never counting or proxying", async () => {
    const cases: [string[], string][] = [
      [["verify-email"], "GET"],
      [["verify-email"], "POST"],
      [["some", "new-endpoint"], "POST"],
      [["oauth2", "authorize"], "GET"],
      [["token"], "GET"],
      [["sign-in", "email"], "GET"],
      [["get-session"], "POST"],
      [["sign-out"], "PUT"],
      [["sign-out"], "PATCH"],
      [["sign-out"], "DELETE"],
      // Allowlisted once canonical, but forwarded upstream in another spelling.
      [["Sign-In", "email"], "POST"],
      [["sign%2Din", "email"], "POST"],
      [["Get-Session"], "GET"],
    ];
    for (const [path, method] of cases) {
      const response = await call(path, IP, method);
      expect(response.status).toBe(404);
      expect((await response.json()).error.code).toBe("not_found");
    }
    expect(rateLimit).not.toHaveBeenCalled();
    expect(handler).not.toHaveBeenCalled();
  });

  it("never forwards GET verify-email, whose 302 the upstream fetch would follow", async () => {
    const response = await limited(
      new Request(
        "https://lorestep.test/api/auth/verify-email?token=x&callbackURL=https%3A%2F%2Fx.test",
      ),
      { params: Promise.resolve({ path: ["verify-email"] }) },
    );
    expect(response.status).toBe(404);
    expect(handler).not.toHaveBeenCalled();
  });

  it("gives only the allowlisted non-credential paths the default bucket alone", async () => {
    await call(["sign-out"]);
    await call(["oauth2", "consent"]);

    expect(buckets()).toEqual(["auth:1.2.3.4", "auth:1.2.3.4"]);
  });

  it("proxies every allowlisted POST", async () => {
    for (const path of [
      "sign-in/email",
      "sign-up/email",
      "sign-out",
      "sign-in/social",
      "request-password-reset",
      "reset-password",
      "oauth2/continue",
      "oauth2/consent",
    ]) {
      expect((await call(path.split("/"))).status).toBe(200);
    }
    expect(handler).toHaveBeenCalledTimes(8);
  });

  it("also counts sign-in and reset requests per hashed email, never the raw address", async () => {
    const hash = createHash("sha256").update("a@example.com").digest("hex");

    await post(["sign-in", "email"], JSON.stringify({ email: "  A@Example.com ", password: "x" }));
    await post(["request-password-reset"], JSON.stringify({ email: "a@example.com" }));

    expect(buckets()).toEqual([
      "auth:1.2.3.4",
      "auth:sign-in/email:1.2.3.4",
      `auth:email:sign-in/email:${hash}`,
      "auth:1.2.3.4",
      "auth:request-password-reset:1.2.3.4",
      `auth:email:request-password-reset:${hash}`,
    ]);
    expect(rateLimit.mock.calls[2]).toEqual([`auth:email:sign-in/email:${hash}`, 10, 900]);
    expect(buckets().join(" ")).not.toMatch(/example/i);
    // The proxied request still carries its body.
    const forwarded: unknown = handler.mock.calls[0]?.[0];
    expect(forwarded instanceof Request && (await forwarded.json()).password).toBe("x");
  });

  it("skips the email bucket for other paths and for a body with no usable email", async () => {
    await post(["sign-up", "email"], JSON.stringify({ email: "a@example.com" }));
    await post(["sign-in", "email"], "not json");
    await post(["sign-in", "email"], JSON.stringify({ email: "  " }));
    await post(["sign-in", "email"], JSON.stringify({ email: 7 }));

    expect(buckets().some((bucket) => String(bucket).startsWith("auth:email:"))).toBe(false);
    expect(handler).toHaveBeenCalledTimes(4);
  });

  it("answers 429 past the email cap and never proxies", async () => {
    rateLimit
      .mockResolvedValueOnce({ allowed: true, retryAfterSec: 30 })
      .mockResolvedValueOnce({ allowed: true, retryAfterSec: 30 })
      .mockResolvedValueOnce({ allowed: false, retryAfterSec: 600 });
    const response = await post(["sign-in", "email"], JSON.stringify({ email: "a@example.com" }));

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("600");
    expect(handler).not.toHaveBeenCalled();
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

  it("proxies GET get-session without limiting it", async () => {
    expect(await (await call(["get-session"], {}, "GET")).text()).toBe("proxied");
    expect(rateLimit).not.toHaveBeenCalled();
  });
});
