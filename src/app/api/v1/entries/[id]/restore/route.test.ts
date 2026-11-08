import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/v1/entries/[id]/restore/route";
import { HttpError } from "@/lib/http/http-error";

const { requireUser, rateLimit, assertSameOrigin, restoreEntry } = vi.hoisted(() => ({
  requireUser: vi.fn(),
  rateLimit: vi.fn(),
  assertSameOrigin: vi.fn(),
  restoreEntry: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({ requireUser }));
vi.mock("@/lib/db/rate-limit", () => ({ rateLimit }));
vi.mock("@/lib/http/assert-same-origin", () => ({ assertSameOrigin }));
vi.mock("@/services/log/entries-service", () => ({ restoreEntry }));

const ID = "0b6f3c1e-8a5d-4c2b-9e7f-1a2b3c4d5e6f";

const request = () =>
  new NextRequest(`https://lorestep.test/api/v1/entries/${ID}/restore`, { method: "POST" });
const context = (id = ID) => ({ params: Promise.resolve({ id }) });

describe("POST /api/v1/entries/:id/restore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({ userId: "user-a", via: "bearer" });
    rateLimit.mockResolvedValue({ allowed: true, retryAfterSec: 30 });
    restoreEntry.mockResolvedValue({ id: ID, title: "Dune" });
  });

  it("restores the caller's tombstone and answers 200 with the entry", async () => {
    const response = await POST(request(), context());

    expect(response.status).toBe(200);
    expect(restoreEntry).toHaveBeenCalledWith("user-a", ID);
    expect(await response.json()).toEqual({ data: { id: ID, title: "Dune" } });
  });

  it("answers 404 when there is nothing to restore (foreign, purged, never deleted)", async () => {
    restoreEntry.mockResolvedValueOnce(null);

    expect((await POST(request(), context())).status).toBe(404);
  });

  it("answers 404 to a malformed id without a query", async () => {
    expect((await POST(request(), context("1 OR 1=1"))).status).toBe(404);
    expect(restoreEntry).not.toHaveBeenCalled();
  });

  it("answers 401 without a user and 403 on a failed CSRF check", async () => {
    requireUser.mockRejectedValueOnce(new HttpError(401, "unauthorized", "Sign in to continue."));
    expect((await POST(request(), context())).status).toBe(401);

    requireUser.mockResolvedValue({ userId: "user-a", via: "session" });
    assertSameOrigin.mockImplementationOnce(() => {
      throw new HttpError(403, "csrf_failed", "Reload the page and try again.");
    });
    expect((await POST(request(), context())).status).toBe(403);
    expect(restoreEntry).not.toHaveBeenCalled();
  });

  it("answers 429 when the write budget is spent", async () => {
    rateLimit.mockResolvedValueOnce({ allowed: false, retryAfterSec: 30 });

    expect((await POST(request(), context())).status).toBe(429);
    expect(restoreEntry).not.toHaveBeenCalled();
  });
});
