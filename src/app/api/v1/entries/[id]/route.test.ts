import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE, GET, PATCH } from "@/app/api/v1/entries/[id]/route";
import { HttpError } from "@/lib/http/http-error";

const { requireUser, rateLimit, assertSameOrigin, getEntry, updateEntry, deleteEntry } =
  vi.hoisted(() => ({
    requireUser: vi.fn(),
    rateLimit: vi.fn(),
    assertSameOrigin: vi.fn(),
    getEntry: vi.fn(),
    updateEntry: vi.fn(),
    deleteEntry: vi.fn(),
  }));

vi.mock("@/lib/auth/require-user", () => ({ requireUser }));
vi.mock("@/lib/db/rate-limit", () => ({ rateLimit }));
vi.mock("@/lib/http/assert-same-origin", () => ({ assertSameOrigin }));
vi.mock("@/services/log/entries-service", () => ({ getEntry, updateEntry, deleteEntry }));

const ID = "0b6f3c1e-8a5d-4c2b-9e7f-1a2b3c4d5e6f";

const request = (method: string, body?: string) =>
  new NextRequest(`https://lorestep.test/api/v1/entries/${ID}`, {
    method,
    headers: { "content-type": "application/json" },
    body,
  });
const context = (id = ID) => ({ params: Promise.resolve({ id }) });

describe("/api/v1/entries/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // User B asks for user A's entry: the owner-scoped service finds nothing.
    requireUser.mockResolvedValue({ userId: "user-b", via: "bearer" });
    rateLimit.mockResolvedValue({ allowed: true, retryAfterSec: 30 });
    getEntry.mockResolvedValue(null);
    updateEntry.mockResolvedValue(null);
    deleteEntry.mockResolvedValue(false);
  });

  it("answers 404 to another user's entry on GET, PATCH and DELETE", async () => {
    expect((await GET(request("GET"), context())).status).toBe(404);
    expect((await PATCH(request("PATCH", '{"notes":"x"}'), context())).status).toBe(404);
    expect((await DELETE(request("DELETE"), context())).status).toBe(404);

    expect(getEntry).toHaveBeenCalledWith("user-b", ID);
    expect(updateEntry).toHaveBeenCalledWith("user-b", ID, { notes: "x" });
    expect(deleteEntry).toHaveBeenCalledWith("user-b", ID);
  });

  it("answers 404 to a malformed id without a query", async () => {
    expect((await GET(request("GET"), context("1 OR 1=1"))).status).toBe(404);
    expect(getEntry).not.toHaveBeenCalled();
  });

  it("answers 401 before looking anything up", async () => {
    requireUser.mockRejectedValueOnce(new HttpError(401, "unauthorized", "Sign in to continue."));

    expect((await GET(request("GET"), context())).status).toBe(401);
    expect(getEntry).not.toHaveBeenCalled();
  });

  it("runs the CSRF check on cookie mutations", async () => {
    requireUser.mockResolvedValue({ userId: "user-a", via: "session" });
    assertSameOrigin.mockImplementationOnce(() => {
      throw new HttpError(403, "csrf_failed", "Reload the page and try again.");
    });

    expect((await DELETE(request("DELETE"), context())).status).toBe(403);
    expect(deleteEntry).not.toHaveBeenCalled();
  });

  it("answers 204 on delete and 400 on an invalid patch", async () => {
    deleteEntry.mockResolvedValueOnce(true);

    expect((await DELETE(request("DELETE"), context())).status).toBe(204);
    expect((await PATCH(request("PATCH", '{"rating":11}'), context())).status).toBe(400);
    expect(updateEntry).not.toHaveBeenCalled();
  });
});
