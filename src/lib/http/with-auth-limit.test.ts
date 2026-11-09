import { beforeEach, describe, expect, it, vi } from "vitest";

import { withAuthLimit } from "@/lib/http/with-auth-limit";

const { rateLimit } = vi.hoisted(() => ({ rateLimit: vi.fn() }));

vi.mock("@/lib/db/rate-limit", () => ({ rateLimit }));

const handler = vi.fn(() => Promise.resolve(new Response("proxied")));
const limited = withAuthLimit(handler);

const IP = { "x-forwarded-for": "1.2.3.4" };

const call = (path: string[], headers: Record<string, string> = IP) =>
  limited(
    new Request(`https://lorestep.test/api/auth/${path.join("/")}`, { method: "POST", headers }),
    { params: Promise.resolve({ path }) },
  );

describe("withAuthLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rateLimit.mockResolvedValue({ allowed: true, retryAfterSec: 30 });
  });

  it("counts credential POSTs per client IP, then proxies", async () => {
    for (const path of [["sign-in", "email"], ["sign-up", "email"], ["request-password-reset"]]) {
      expect(await (await call(path)).text()).toBe("proxied");
    }
    expect(rateLimit).toHaveBeenCalledTimes(3);
    expect(rateLimit).toHaveBeenCalledWith("auth:1.2.3.4", 10, 60);
  });

  it("answers 429 with Retry-After past the cap and never proxies", async () => {
    rateLimit.mockResolvedValueOnce({ allowed: false, retryAfterSec: 42 });

    const response = await call(["sign-in", "email"]);

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("42");
    expect(handler).not.toHaveBeenCalled();
  });

  it("answers 403 when the client IP cannot be resolved", async () => {
    const response = await call(["sign-up", "email"], {});

    expect(response.status).toBe(403);
    expect(rateLimit).not.toHaveBeenCalled();
    expect(handler).not.toHaveBeenCalled();
  });

  it("leaves every other path untouched", async () => {
    for (const path of [["sign-out"], ["oauth2", "token"], ["get-session"]]) {
      expect(await (await call(path, {})).text()).toBe("proxied");
    }
    expect(rateLimit).not.toHaveBeenCalled();
  });
});
