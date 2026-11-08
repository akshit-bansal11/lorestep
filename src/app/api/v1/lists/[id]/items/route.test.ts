import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/v1/lists/[id]/items/route";
import { HttpError } from "@/lib/http/http-error";

const { requireUser, rateLimit, assertSameOrigin, addListItem } = vi.hoisted(() => ({
  requireUser: vi.fn(),
  rateLimit: vi.fn(),
  assertSameOrigin: vi.fn(),
  addListItem: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({ requireUser }));
vi.mock("@/lib/db/rate-limit", () => ({ rateLimit }));
vi.mock("@/lib/http/assert-same-origin", () => ({ assertSameOrigin }));
vi.mock("@/services/log/lists-service", () => ({ addListItem }));

const ID = "0b6f3c1e-8a5d-4c2b-9e7f-1a2b3c4d5e6f";

const post = (body: unknown) =>
  new NextRequest(`https://lorestep.test/api/v1/lists/${ID}/items`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
const context = (id = ID) => ({ params: Promise.resolve({ id }) });
const ITEM = { kind: "movie", title: "Heat", extSource: "tmdb", extId: "949" };

describe("POST /api/v1/lists/:id/items", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({ userId: "user-b", via: "bearer" });
    rateLimit.mockResolvedValue({ allowed: true, retryAfterSec: 30 });
  });

  it("answers 404 when the service finds no list owned by the caller", async () => {
    addListItem.mockRejectedValueOnce(new HttpError(404, "not_found", "No list."));

    expect((await POST(post(ITEM), context())).status).toBe(404);
    expect(addListItem).toHaveBeenCalledWith("user-b", ID, ITEM);
  });

  it("answers 404 to a malformed list id without a query", async () => {
    expect((await POST(post(ITEM), context("nope"))).status).toBe(404);
    expect(addListItem).not.toHaveBeenCalled();
  });

  it("answers 201, and 409 for a duplicate or a full list", async () => {
    addListItem.mockResolvedValueOnce({ id: "i1" });
    addListItem.mockRejectedValueOnce(new HttpError(409, "duplicate", "Already there."));
    addListItem.mockRejectedValueOnce(new HttpError(409, "limit", "Full."));

    expect((await POST(post(ITEM), context())).status).toBe(201);
    expect((await POST(post(ITEM), context())).status).toBe(409);
    expect((await POST(post(ITEM), context())).status).toBe(409);
  });

  it("answers 400 for an external id without its source, an http image or an extra field", async () => {
    expect((await POST(post({ kind: "movie", title: "A", extId: "1" }), context())).status).toBe(
      400,
    );
    expect(
      (await POST(post({ kind: "movie", title: "A", imageUrl: "http://x.test/a.jpg" }), context()))
        .status,
    ).toBe(400);
    expect((await POST(post({ ...ITEM, userId: "user-a" }), context())).status).toBe(400);
    expect(addListItem).not.toHaveBeenCalled();
  });

  it("runs the CSRF check on cookie mutations", async () => {
    requireUser.mockResolvedValue({ userId: "user-a", via: "session" });
    assertSameOrigin.mockImplementationOnce(() => {
      throw new HttpError(403, "csrf_failed", "Reload the page and try again.");
    });

    expect((await POST(post(ITEM), context())).status).toBe(403);
    expect(addListItem).not.toHaveBeenCalled();
  });
});
