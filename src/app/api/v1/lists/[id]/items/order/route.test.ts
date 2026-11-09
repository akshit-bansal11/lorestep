import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PUT } from "@/app/api/v1/lists/[id]/items/order/route";
import { HttpError } from "@/lib/http/http-error";

const { requireUser, rateLimit, assertSameOrigin, reorderListItems } = vi.hoisted(() => ({
  requireUser: vi.fn(),
  rateLimit: vi.fn(),
  assertSameOrigin: vi.fn(),
  reorderListItems: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({ requireUser }));
vi.mock("@/lib/db/rate-limit", () => ({ rateLimit }));
vi.mock("@/lib/http/assert-same-origin", () => ({ assertSameOrigin }));
vi.mock("@/services/log/lists-service", () => ({ reorderListItems }));

const ID = "0b6f3c1e-8a5d-4c2b-9e7f-1a2b3c4d5e6f";
const A = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
const B = "1b4e28ba-2fa1-4d3b-a3fc-2c963f66afa6";

const put = (body: unknown) =>
  new NextRequest(`https://lorestep.test/api/v1/lists/${ID}/items/order`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
const context = (id = ID) => ({ params: Promise.resolve({ id }) });

describe("PUT /api/v1/lists/:id/items/order", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({ userId: "user-b", via: "bearer" });
    rateLimit.mockResolvedValue({ allowed: true, retryAfterSec: 30 });
    reorderListItems.mockResolvedValue(undefined);
  });

  it("answers 204 and hands the ids to the owner-scoped service", async () => {
    expect((await PUT(put({ ids: [A, B] }), context())).status).toBe(204);
    expect(reorderListItems).toHaveBeenCalledWith("user-b", ID, [A, B]);
  });

  it("answers 400 when the service rejects a foreign id", async () => {
    reorderListItems.mockRejectedValueOnce(new HttpError(400, "invalid_order", "Reload."));

    expect((await PUT(put({ ids: [A, B] }), context())).status).toBe(400);
  });

  it("answers 404 when the list is not the caller's", async () => {
    reorderListItems.mockRejectedValueOnce(new HttpError(404, "not_found", "No list."));

    expect((await PUT(put({ ids: [A] }), context())).status).toBe(404);
    expect((await PUT(put({ ids: [A] }), context("nope"))).status).toBe(404);
  });

  it("answers 400 for a non-uuid or repeated id without a query", async () => {
    expect((await PUT(put({ ids: ["x"] }), context())).status).toBe(400);
    expect((await PUT(put({ ids: [A, A] }), context())).status).toBe(400);
    expect(reorderListItems).not.toHaveBeenCalled();
  });

  it("runs the CSRF check on cookie mutations", async () => {
    requireUser.mockResolvedValue({ userId: "user-a", via: "session" });
    assertSameOrigin.mockImplementationOnce(() => {
      throw new HttpError(403, "csrf_failed", "Reload the page and try again.");
    });

    expect((await PUT(put({ ids: [A] }), context())).status).toBe(403);
    expect(reorderListItems).not.toHaveBeenCalled();
  });
});
