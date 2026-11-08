import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET, POST } from "@/app/api/v1/lists/route";
import { HttpError } from "@/lib/http/http-error";

const { requireUser, rateLimit, assertSameOrigin, listLists, createList } = vi.hoisted(() => ({
  requireUser: vi.fn(),
  rateLimit: vi.fn(),
  assertSameOrigin: vi.fn(),
  listLists: vi.fn(),
  createList: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({ requireUser }));
vi.mock("@/lib/db/rate-limit", () => ({ rateLimit }));
vi.mock("@/lib/http/assert-same-origin", () => ({ assertSameOrigin }));
vi.mock("@/services/log/lists-service", () => ({ listLists, createList }));

const post = (body: unknown) =>
  new NextRequest("https://lorestep.test/api/v1/lists", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

describe("/api/v1/lists", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({ userId: "user-b", via: "bearer" });
    rateLimit.mockResolvedValue({ allowed: true, retryAfterSec: 30 });
    listLists.mockResolvedValue([]);
  });

  it("lists only the caller's lists", async () => {
    const response = await GET(new Request("https://lorestep.test/api/v1/lists"));

    expect(response.status).toBe(200);
    expect(listLists).toHaveBeenCalledWith("user-b");
  });

  it("answers 401 without a user", async () => {
    requireUser.mockRejectedValueOnce(new HttpError(401, "unauthorized", "Sign in to continue."));

    expect((await GET(new Request("https://lorestep.test/api/v1/lists"))).status).toBe(401);
    expect(listLists).not.toHaveBeenCalled();
  });

  it("creates with 201 and passes the caller's id", async () => {
    createList.mockResolvedValueOnce({ id: "l1" });

    expect((await POST(post({ name: "Weekend" }))).status).toBe(201);
    expect(createList).toHaveBeenCalledWith("user-b", { name: "Weekend" });
  });

  it("answers 400 for a name over 80 characters, a missing name or an unknown field", async () => {
    expect((await POST(post({ name: "x".repeat(81) }))).status).toBe(400);
    expect((await POST(post({ description: "d" }))).status).toBe(400);
    expect((await POST(post({ name: "a", userId: "user-a" }))).status).toBe(400);
    expect((await POST(post({ name: "a", description: "d".repeat(501) }))).status).toBe(400);
    expect(createList).not.toHaveBeenCalled();
  });

  it("passes the service's 409 duplicate and limit through", async () => {
    createList.mockRejectedValueOnce(new HttpError(409, "duplicate", "Same name."));
    createList.mockRejectedValueOnce(new HttpError(409, "limit", "Full."));

    const duplicate = await POST(post({ name: "a" }));
    const limit = await POST(post({ name: "b" }));

    expect(duplicate.status).toBe(409);
    expect((await duplicate.json()).error.code).toBe("duplicate");
    expect((await limit.json()).error.code).toBe("limit");
  });

  it("runs the CSRF check on cookie mutations", async () => {
    requireUser.mockResolvedValue({ userId: "user-a", via: "session" });
    assertSameOrigin.mockImplementationOnce(() => {
      throw new HttpError(403, "csrf_failed", "Reload the page and try again.");
    });

    expect((await POST(post({ name: "a" }))).status).toBe(403);
    expect(createList).not.toHaveBeenCalled();
  });
});
