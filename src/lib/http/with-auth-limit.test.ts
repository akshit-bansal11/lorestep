import { createHash } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { HttpError } from "@/lib/http/http-error";
import { canonicalAuthPath, withAuthLimit } from "@/lib/http/with-auth-limit";
import type { AuthRouteHandler } from "@/types/auth/auth";

const { rateLimit } = vi.hoisted(() => ({ rateLimit: vi.fn() }));

vi.mock("@/lib/db/rate-limit", () => ({ rateLimit }));

const handler = vi.fn<AuthRouteHandler>(() => Promise.resolve(new Response("proxied")));
const limited = withAuthLimit(handler);

const IP = { "x-forwarded-for": "1.2.3.4" };

// `path` is the forwarded `params.path`; the URL is deliberately unrelated, since it is not read.
const call = (path: string[], headers: Record<string, string> = IP, method = "POST") =>
  limited(new Request("https://lorestep.test/api/auth/x", { method, headers }), {
    params: Promise.resolve({ path }),
  });

const JSON_TYPE = { "content-type": "application/json" };
const EMAIL_BODY = JSON.stringify({ email: "  A@Example.com ", password: "x" });
const HASH = createHash("sha256").update("a@example.com").digest("hex");

const post = (
  path: string[],
  body: string,
  headers: Record<string, string> = JSON_TYPE,
  ip = "1.2.3.4",
) =>
  limited(
    new Request("https://lorestep.test/api/auth/x", {
      method: "POST",
      headers: { ...headers, "x-forwarded-for": ip },
      body,
    }),
    { params: Promise.resolve({ path }) },
  );

const buckets = () => rateLimit.mock.calls.map((args: unknown[]) => args[0]);

/** The body of the request `handler` was called with the `index`-th time. */
async function forwardedBody(index: number): Promise<string> {
  const forwarded: unknown = handler.mock.calls[index]?.[0];
  return forwarded instanceof Request ? forwarded.text() : "";
}

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

  it("counts a credential POST in the default and its strict buckets, then proxies", async () => {
    expect(await (await post(["sign-in", "email"], EMAIL_BODY)).text()).toBe("proxied");

    expect(rateLimit.mock.calls).toEqual([
      ["auth:1.2.3.4", 30, 60],
      ["auth:sign-in/email:1.2.3.4", 10, 60],
      [`auth:email:sign-in/email:${HASH}:1.2.3.4`, 10, 900],
      [`auth:email:sign-in/email:${HASH}`, 40, 3600],
    ]);
    expect(buckets().join(" ")).not.toMatch(/example/i);
    expect(await forwardedBody(0)).toBe(EMAIL_BODY);
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
      expect((await post(path.split("/"), EMAIL_BODY)).status).toBe(200);
    }
    expect(handler).toHaveBeenCalledTimes(8);
  });

  it("keys the strict email bucket per IP, so nobody elsewhere can lock a victim out", async () => {
    await post(["sign-in", "email"], EMAIL_BODY, JSON_TYPE, "1.2.3.4");
    await post(["sign-in", "email"], EMAIL_BODY, JSON_TYPE, "5.6.7.8");

    const strict = buckets().filter((bucket) => String(bucket).endsWith(`${HASH}:5.6.7.8`));
    expect(strict).toEqual([`auth:email:sign-in/email:${HASH}:5.6.7.8`]);
    const global = buckets().filter((bucket) => bucket === `auth:email:sign-in/email:${HASH}`);
    expect(global).toHaveLength(2);
  });

  it("applies the global per-email cap across IPs and never proxies past it", async () => {
    rateLimit.mockImplementation((bucket: string) =>
      Promise.resolve(
        bucket === `auth:email:sign-in/email:${HASH}`
          ? { allowed: false, retryAfterSec: 600 }
          : { allowed: true, retryAfterSec: 30 },
      ),
    );
    const response = await post(["sign-in", "email"], EMAIL_BODY, JSON_TYPE, "9.9.9.9");

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("600");
    expect(handler).not.toHaveBeenCalled();
  });

  it("gives password reset its own email buckets: a sign-in lockout never blocks it", async () => {
    rateLimit.mockImplementation((bucket: string) =>
      Promise.resolve(
        String(bucket).startsWith("auth:email:sign-in/email:")
          ? { allowed: false, retryAfterSec: 600 }
          : { allowed: true, retryAfterSec: 30 },
      ),
    );
    expect((await post(["sign-in", "email"], EMAIL_BODY)).status).toBe(429);
    const reset = await post(["request-password-reset"], EMAIL_BODY);

    expect(reset.status).toBe(200);
    const email = "auth:email:request-password-reset:";
    const calls = rateLimit.mock.calls.filter(([bucket]) => String(bucket).startsWith(email));
    expect(calls).toEqual([
      [`auth:email:request-password-reset:${HASH}:1.2.3.4`, 10, 900],
      [`auth:email:request-password-reset:${HASH}`, 5, 3600],
    ]);
  });

  it("answers 415 or 400 for an email-limited POST without a JSON email", async () => {
    const cases: [string, Record<string, string>, number][] = [
      [EMAIL_BODY, {}, 415],
      [EMAIL_BODY, { "content-type": "text/plain" }, 415],
      [EMAIL_BODY, { "content-type": "application/x-www-form-urlencoded" }, 415],
      ["not json", JSON_TYPE, 400],
      ["[]", JSON_TYPE, 400],
      ["null", JSON_TYPE, 400],
      [JSON.stringify({ password: "x" }), JSON_TYPE, 400],
      [JSON.stringify({ email: "  " }), JSON_TYPE, 400],
      [JSON.stringify({ email: 7 }), JSON_TYPE, 400],
    ];
    for (const path of [["sign-in", "email"], ["request-password-reset"]]) {
      for (const [body, headers, status] of cases) {
        expect((await post(path, body, headers)).status).toBe(status);
      }
    }
    expect(handler).not.toHaveBeenCalled();
  });

  it("accepts JSON with parameters and leaves other paths' bodies alone", async () => {
    const charset = { "content-type": "Application/JSON; charset=utf-8" };
    expect((await post(["sign-in", "email"], EMAIL_BODY, charset)).status).toBe(200);
    expect((await post(["sign-up", "email"], "anything", {})).status).toBe(200);

    expect(buckets().filter((bucket) => String(bucket).includes("sign-up/email:"))).toEqual([]);
    expect(await forwardedBody(1)).toBe("anything");
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
