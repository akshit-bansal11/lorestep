import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE, GET, PATCH } from "@/app/api/v1/lists/[id]/route";
import { HttpError } from "@/lib/http/http-error";

const { requireUser, rateLimit, assertSameOrigin, getList, updateList, deleteList } = vi.hoisted(
  () => ({
    requireUser: vi.fn(),
    rateLimit: vi.fn(),
    assertSameOrigin: vi.fn(),
    getList: vi.fn(),
    updateList: vi.fn(),
    deleteList: vi.fn(),
  }),
);

vi.mock("@/lib/auth/require-user", () => ({ requireUser }));
vi.mock("@/lib/db/rate-limit", () => ({ rateLimit }));
vi.mock("@/lib/http/assert-same-origin", () => ({ assertSameOrigin }));
vi.mock("@/services/log/lists-service", () => ({ getList, updateList, deleteList }));

const ID = "0b6f3c1e-8a5d-4c2b-9e7f-1a2b3c4d5e6f";

const request = (method: string, body?: string) =>
  new NextRequest(`https://lorestep.test/api/v1/lists/${ID}`, {
    method,
    headers: { "content-type": "application/json" },
    body,
  });
const context = (id = ID) => ({ params: Promise.resolve({ id }) });

describe("/api/v1/lists/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // User B asks for user A's list: the owner-scoped service finds nothing.
    requireUser.mockResolvedValue({ userId: "user-b", via: "bearer" });
    rateLimit.mockResolvedValue({ allowed: true, retryAfterSec: 30 });
    getList.mockResolvedValue(null);
    updateList.mockResolvedValue(null);
    deleteList.mockResolvedValue(false);
  });

  it("answers 404 to another user's list on GET, PATCH and DELETE", async () => {
    expect((await GET(request("GET"), context())).status).toBe(404);
    expect((await PATCH(request("PATCH", '{"name":"x"}'), context())).status).toBe(404);
    expect((await DELETE(request("DELETE"), context())).status).toBe(404);

    expect(getList).toHaveBeenCalledWith("user-b", ID);
    expect(updateList).toHaveBeenCalledWith("user-b", ID, { name: "x" });
    expect(deleteList).toHaveBeenCalledWith("user-b", ID);
  });

  it("answers 404 to a malformed id without a query", async () => {
    expect((await GET(request("GET"), context("1 OR 1=1"))).status).toBe(404);
    expect(getList).not.toHaveBeenCalled();
  });

  it("answers 401 before looking anything up", async () => {
    requireUser.mockRejectedValueOnce(new HttpError(401, "unauthorized", "Sign in to continue."));

    expect((await GET(request("GET"), context())).status).toBe(401);
    expect(getList).not.toHaveBeenCalled();
  });

  it("runs the CSRF check on cookie mutations", async () => {
    requireUser.mockResolvedValue({ userId: "user-a", via: "session" });
    assertSameOrigin.mockImplementationOnce(() => {
      throw new HttpError(403, "csrf_failed", "Reload the page and try again.");
    });

    expect((await DELETE(request("DELETE"), context())).status).toBe(403);
    expect(deleteList).not.toHaveBeenCalled();
  });

  it("answers 204 on delete, 409 on a duplicate rename and 400 on an invalid patch", async () => {
    deleteList.mockResolvedValueOnce(true);
    updateList.mockRejectedValueOnce(new HttpError(409, "duplicate", "Same name."));

    expect((await DELETE(request("DELETE"), context())).status).toBe(204);
    expect((await PATCH(request("PATCH", '{"name":"a"}'), context())).status).toBe(409);
    expect((await PATCH(request("PATCH", '{"kinds":["book"]}'), context())).status).toBe(400);
  });
});
