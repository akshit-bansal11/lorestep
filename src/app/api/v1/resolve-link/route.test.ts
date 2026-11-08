import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/v1/resolve-link/route";
import { UnsafeUrlError } from "@/lib/http/guard-url";
import { HttpError } from "@/lib/http/http-error";

const { requireUser, rateLimit, resolveLink, assertSameOrigin } = vi.hoisted(() => ({
  requireUser: vi.fn(),
  rateLimit: vi.fn(),
  resolveLink: vi.fn(),
  assertSameOrigin: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({ requireUser }));
vi.mock("@/lib/db/rate-limit", () => ({ rateLimit }));
vi.mock("@/lib/resolve", () => ({ resolveLink }));
vi.mock("@/lib/http/assert-same-origin", () => ({ assertSameOrigin }));

const call = (body: string) =>
  POST(
    new NextRequest("https://lorestep.test/api/v1/resolve-link", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    }),
  );
const withUrl = (url: string) => call(JSON.stringify({ url }));

describe("POST /api/v1/resolve-link", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({ userId: "u1", via: "bearer" });
    rateLimit.mockResolvedValue({ allowed: true, retryAfterSec: 30 });
  });

  it("answers 401 without a session and does no work", async () => {
    requireUser.mockRejectedValueOnce(new HttpError(401, "unauthorized", "Sign in to continue."));

    expect((await withUrl("https://www.imdb.com/title/tt1/")).status).toBe(401);
    expect(resolveLink).not.toHaveBeenCalled();
  });

  it("runs the CSRF check for cookie callers only", async () => {
    resolveLink.mockResolvedValue({ id: "tt1", title: "Heat" });

    await withUrl("https://www.imdb.com/title/tt1/");
    expect(assertSameOrigin).not.toHaveBeenCalled();

    requireUser.mockResolvedValueOnce({ userId: "u1", via: "session" });
    await withUrl("https://www.imdb.com/title/tt1/");
    expect(assertSameOrigin).toHaveBeenCalledTimes(1);

    requireUser.mockResolvedValueOnce({ userId: "u1", via: "session" });
    assertSameOrigin.mockImplementationOnce(() => {
      throw new HttpError(403, "csrf_failed", "Reload the page and try again.");
    });
    expect((await withUrl("https://www.imdb.com/title/tt1/")).status).toBe(403);
  });

  it("answers 429 with Retry-After once the user's cap is passed", async () => {
    rateLimit.mockResolvedValueOnce({ allowed: false, retryAfterSec: 21 });

    const res = await withUrl("https://www.imdb.com/title/tt1/");

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("21");
    expect(rateLimit.mock.calls[0]?.[0]).toBe("resolve:u1");
    expect(resolveLink).not.toHaveBeenCalled();
  });

  it.each(["not json", "{}", JSON.stringify({ url: 5 }), JSON.stringify({ url: "" })])(
    "answers 400 for body %j",
    async (body) => {
      expect((await call(body)).status).toBe(400);
      expect(resolveLink).not.toHaveBeenCalled();
    },
  );

  it("answers 422 unsupported_host when the URL breaks the SSRF policy", async () => {
    resolveLink.mockRejectedValueOnce(new UnsafeUrlError("IP literal"));

    const res = await withUrl("https://127.0.0.1/");

    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe("unsupported_host");
  });

  it("answers 422 when a supported link yields nothing", async () => {
    resolveLink.mockResolvedValueOnce(null);

    const res = await withUrl("https://www.imdb.com/title/tt1/");

    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe("unresolvable");
  });

  it("answers the resolved item", async () => {
    resolveLink.mockResolvedValueOnce({ id: "tt1", title: "Heat" });

    const res = await withUrl("https://www.imdb.com/title/tt1/");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: { id: "tt1", title: "Heat" } });
    expect(resolveLink).toHaveBeenCalledWith("https://www.imdb.com/title/tt1/");
  });
});
