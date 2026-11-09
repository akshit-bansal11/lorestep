import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PUT } from "@/app/api/v1/entries/game/[gameId]/route";
import { HttpError } from "@/lib/http/http-error";

const { requireUser, rateLimit, setGameEntry } = vi.hoisted(() => ({
  requireUser: vi.fn(),
  rateLimit: vi.fn(),
  setGameEntry: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({ requireUser }));
vi.mock("@/lib/db/rate-limit", () => ({ rateLimit }));
vi.mock("@/lib/http/assert-same-origin", () => ({ assertSameOrigin: vi.fn() }));
vi.mock("@/services/log/entries-service", () => ({ setGameEntry }));

const put = (body: string, gameId = "hades") =>
  PUT(
    new NextRequest(`https://lorestep.test/api/v1/entries/game/${gameId}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body,
    }),
    { params: Promise.resolve({ gameId }) },
  );

describe("PUT /api/v1/entries/game/:gameId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({ userId: "u1", via: "bearer" });
    rateLimit.mockResolvedValue({ allowed: true, retryAfterSec: 30 });
  });

  it("upserts a library status", async () => {
    setGameEntry.mockResolvedValue({ id: "e1", status: "planned", shelf: "own" });

    const res = await put('{"status":"backlogged","device":"pc"}');

    expect(res.status).toBe(200);
    expect(setGameEntry).toHaveBeenCalledWith("u1", "hades", {
      status: "backlogged",
      device: "pc",
    });
  });

  it("answers 204 when cleared", async () => {
    setGameEntry.mockResolvedValue(null);

    expect((await put('{"status":null}')).status).toBe(204);
  });

  it("answers 404 for a game not in the catalog", async () => {
    setGameEntry.mockRejectedValue(new HttpError(404, "not_found", "Not in the catalog."));

    expect((await put('{"status":"playing"}')).status).toBe(404);
  });

  it("rejects an unknown status or device", async () => {
    expect((await put('{"status":"watching"}')).status).toBe(400);
    expect((await put('{"status":"playing","device":"toaster"}')).status).toBe(400);
    expect(setGameEntry).not.toHaveBeenCalled();
  });
});
