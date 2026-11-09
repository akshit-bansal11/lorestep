import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/v1/search/route";
import { HttpError } from "@/lib/http/http-error";

const { requireUser, rateLimit, searchMedia } = vi.hoisted(() => ({
  requireUser: vi.fn(),
  rateLimit: vi.fn(),
  searchMedia: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({ requireUser }));
vi.mock("@/lib/db/rate-limit", () => ({ rateLimit }));
vi.mock("@/lib/search", () => ({ searchMedia }));

const call = (query: string) => GET(new Request(`https://lorestep.test/api/v1/search?${query}`));

describe("GET /api/v1/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({ userId: "u1", via: "bearer" });
    rateLimit.mockResolvedValue({ allowed: true, retryAfterSec: 30 });
  });

  it("answers 401 without a session and does no work", async () => {
    requireUser.mockRejectedValueOnce(new HttpError(401, "unauthorized", "Sign in to continue."));

    expect((await call("q=dune")).status).toBe(401);
    expect(searchMedia).not.toHaveBeenCalled();
  });

  it("answers 429 with Retry-After once the user's cap is passed", async () => {
    rateLimit.mockResolvedValueOnce({ allowed: false, retryAfterSec: 9 });

    const res = await call("q=dune");

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("9");
    expect(rateLimit.mock.calls[0]?.[0]).toBe("search:u1");
    expect(searchMedia).not.toHaveBeenCalled();
  });

  it.each(["", "q=", "q=dune&type=book"])("answers 400 for query %j", async (query) => {
    expect((await call(query)).status).toBe(400);
    expect(searchMedia).not.toHaveBeenCalled();
  });

  it("answers 502 only when every provider failed and nothing was found", async () => {
    searchMedia.mockResolvedValueOnce({ results: [], errors: ["Game search is unavailable."] });
    expect((await call("q=dune")).status).toBe(502);

    searchMedia.mockResolvedValueOnce({ results: [], errors: [] });
    expect((await call("q=zzz")).status).toBe(200);
  });

  it("answers the results", async () => {
    const hit = { id: "1", title: "Dune", image: null, year: "2021", type: "movie" };
    searchMedia.mockResolvedValueOnce({ results: [hit], errors: ["Game search is unavailable."] });

    const res = await call("q=dune&type=movie");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: [hit] });
    expect(searchMedia).toHaveBeenCalledWith({ q: "dune", type: "movie" });
  });
});
