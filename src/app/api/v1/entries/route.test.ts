import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET, POST } from "@/app/api/v1/entries/route";
import { ENTRY_LIMITS } from "@/constants/log/entries";
import { HttpError } from "@/lib/http/http-error";

const { requireUser, rateLimit, assertSameOrigin, listEntries, createEntry } = vi.hoisted(() => ({
  requireUser: vi.fn(),
  rateLimit: vi.fn(),
  assertSameOrigin: vi.fn(),
  listEntries: vi.fn(),
  createEntry: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({ requireUser }));
vi.mock("@/lib/db/rate-limit", () => ({ rateLimit }));
vi.mock("@/lib/http/assert-same-origin", () => ({ assertSameOrigin }));
vi.mock("@/services/log/entries-service", () => ({ listEntries, createEntry }));

const URL_BASE = "https://lorestep.test/api/v1/entries";
const post = (body: string) =>
  POST(
    new NextRequest(URL_BASE, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    }),
  );

describe("/api/v1/entries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({ userId: "u1", via: "bearer" });
    rateLimit.mockResolvedValue({ allowed: true, retryAfterSec: 30 });
    listEntries.mockResolvedValue({ items: [], nextCursor: null });
  });

  it("clamps the page size and rejects an unknown kind", async () => {
    expect((await GET(new Request(`${URL_BASE}?limit=5000`))).status).toBe(200);
    expect(listEntries).toHaveBeenCalledWith("u1", { limit: ENTRY_LIMITS.pageMax });

    expect((await GET(new Request(`${URL_BASE}?kind=book`))).status).toBe(400);
  });

  it("creates with 201 and validates the body first", async () => {
    createEntry.mockResolvedValue({ id: "e1" });

    expect((await post('{"kind":"movie","title":"Dune"}')).status).toBe(201);
    expect(createEntry).toHaveBeenCalledWith("u1", { kind: "movie", title: "Dune" });

    expect((await post('{"kind":"movie","title":"Dune","shelf":"own"}')).status).toBe(400);
    expect((await post("not json")).status).toBe(400);
    expect(createEntry).toHaveBeenCalledTimes(1);
  });

  it("passes the service's 409 through", async () => {
    createEntry.mockRejectedValue(new HttpError(409, "duplicate", "Already there."));

    const res = await post('{"kind":"game","title":"Hades","gameId":"hades"}');

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: { code: "duplicate", message: "Already there." } });
  });

  it("answers 413 past the body cap", async () => {
    const notes = "x".repeat(ENTRY_LIMITS.bodyBytes);

    expect((await post(JSON.stringify({ kind: "movie", title: "Dune", notes }))).status).toBe(413);
  });

  it("checks CSRF for cookie callers and rate-limits writes per user", async () => {
    requireUser.mockResolvedValue({ userId: "u1", via: "session" });
    createEntry.mockResolvedValue({ id: "e1" });

    await post('{"kind":"movie","title":"Dune"}');

    expect(assertSameOrigin).toHaveBeenCalledTimes(1);
    expect(rateLimit.mock.calls[0]?.[0]).toBe("entries:u1");
  });
});
