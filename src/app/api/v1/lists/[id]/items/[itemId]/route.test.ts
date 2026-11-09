import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE } from "@/app/api/v1/lists/[id]/items/[itemId]/route";
import { HttpError } from "@/lib/http/http-error";

const { requireUser, rateLimit, assertSameOrigin, deleteListItem } = vi.hoisted(() => ({
  requireUser: vi.fn(),
  rateLimit: vi.fn(),
  assertSameOrigin: vi.fn(),
  deleteListItem: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({ requireUser }));
vi.mock("@/lib/db/rate-limit", () => ({ rateLimit }));
vi.mock("@/lib/http/assert-same-origin", () => ({ assertSameOrigin }));
vi.mock("@/services/log/lists-service", () => ({ deleteListItem }));

const ID = "0b6f3c1e-8a5d-4c2b-9e7f-1a2b3c4d5e6f";
const ITEM = "7c9e6679-7425-40de-944b-e07fc1f90ae7";

const request = () =>
  new NextRequest(`https://lorestep.test/api/v1/lists/${ID}/items/${ITEM}`, {
    method: "DELETE",
    headers: { "content-type": "application/json" },
  });
const context = (id = ID, itemId = ITEM) => ({ params: Promise.resolve({ id, itemId }) });

describe("DELETE /api/v1/lists/:id/items/:itemId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({ userId: "user-b", via: "bearer" });
    rateLimit.mockResolvedValue({ allowed: true, retryAfterSec: 30 });
    deleteListItem.mockResolvedValue(false);
  });

  it("answers 404 to another user's item", async () => {
    expect((await DELETE(request(), context())).status).toBe(404);
    expect(deleteListItem).toHaveBeenCalledWith("user-b", ID, ITEM);
  });

  it("answers 404 to a malformed id without a query", async () => {
    expect((await DELETE(request(), context(ID, "x"))).status).toBe(404);
    expect(deleteListItem).not.toHaveBeenCalled();
  });

  it("answers 204 for the owner", async () => {
    deleteListItem.mockResolvedValueOnce(true);

    expect((await DELETE(request(), context())).status).toBe(204);
  });

  it("runs the CSRF check on cookie mutations", async () => {
    requireUser.mockResolvedValue({ userId: "user-a", via: "session" });
    assertSameOrigin.mockImplementationOnce(() => {
      throw new HttpError(403, "csrf_failed", "Reload the page and try again.");
    });

    expect((await DELETE(request(), context())).status).toBe(403);
    expect(deleteListItem).not.toHaveBeenCalled();
  });
});
