import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/v1/metadata/route";
import { HttpError } from "@/lib/http/http-error";

const { requireUser, rateLimit, getMetadata } = vi.hoisted(() => ({
  requireUser: vi.fn(),
  rateLimit: vi.fn(),
  getMetadata: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({ requireUser }));
vi.mock("@/lib/db/rate-limit", () => ({ rateLimit }));
vi.mock("@/lib/metadata", () => ({ getMetadata }));

const call = (query: string) => GET(new Request(`https://lorestep.test/api/v1/metadata?${query}`));

describe("GET /api/v1/metadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({ userId: "u1", via: "session" });
    rateLimit.mockResolvedValue({ allowed: true, retryAfterSec: 30 });
  });

  it("answers 401 without a session and does no work", async () => {
    requireUser.mockRejectedValueOnce(new HttpError(401, "unauthorized", "Sign in to continue."));

    const res = await call("type=movie&id=1");

    expect(res.status).toBe(401);
    expect(rateLimit).not.toHaveBeenCalled();
    expect(getMetadata).not.toHaveBeenCalled();
  });

  it("answers 429 with Retry-After once the user's cap is passed", async () => {
    rateLimit.mockResolvedValueOnce({ allowed: false, retryAfterSec: 17 });

    const res = await call("type=movie&id=1");

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("17");
    expect(rateLimit.mock.calls[0]?.[0]).toBe("meta:u1");
    expect(getMetadata).not.toHaveBeenCalled();
  });

  it("answers 400 for bad parameters", async () => {
    const res = await call("type=podcast&id=1");

    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("invalid_query");
    expect(getMetadata).not.toHaveBeenCalled();
  });

  it("answers 404 when no provider knows the title", async () => {
    getMetadata.mockResolvedValueOnce({ data: null, cached: false });

    expect((await call("type=game&title=Nope")).status).toBe(404);
  });

  it("answers 502 when a provider fails", async () => {
    getMetadata.mockRejectedValueOnce(new HttpError(502, "provider_unavailable", "Try again."));

    expect((await call("type=anime&id=1")).status).toBe(502);
  });

  it("answers the data with cached and the fields still missing", async () => {
    getMetadata.mockResolvedValueOnce({ data: { title: "Heat", type: "movie" }, cached: true });

    const res = await call("type=movie&title=Heat");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual({ title: "Heat", type: "movie" });
    expect(body.cached).toBe(true);
    expect(body.missingFields).toContain("year");
  });
});
