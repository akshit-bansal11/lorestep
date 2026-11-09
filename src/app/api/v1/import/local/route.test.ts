import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/v1/import/local/route";
import { HttpError } from "@/lib/http/http-error";

const { requireUser, rateLimit, assertSameOrigin, importLocal } = vi.hoisted(() => ({
  requireUser: vi.fn(),
  rateLimit: vi.fn(),
  assertSameOrigin: vi.fn(),
  importLocal: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({ requireUser }));
vi.mock("@/lib/db/rate-limit", () => ({ rateLimit }));
vi.mock("@/lib/http/assert-same-origin", () => ({ assertSameOrigin }));
vi.mock("@/services/log/import-local", () => ({ importLocal }));

const post = () =>
  POST(
    new NextRequest("https://lorestep.test/api/v1/import/local", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ entries: {} }),
    }),
  );

describe("POST /api/v1/import/local", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rateLimit.mockResolvedValue({ allowed: true, retryAfterSec: 30 });
  });

  it("answers 401 without a session and imports nothing", async () => {
    requireUser.mockRejectedValueOnce(new HttpError(401, "unauthorized", "Sign in to continue."));

    const response = await post();

    expect(response.status).toBe(401);
    expect(importLocal).not.toHaveBeenCalled();
    expect(assertSameOrigin).not.toHaveBeenCalled();
  });

  it("CSRF-checks a browser session before importing", async () => {
    requireUser.mockResolvedValueOnce({ userId: "u1", via: "session" });
    importLocal.mockResolvedValueOnce({ inserted: 0, skipped: 0 });

    const response = await post();

    expect(assertSameOrigin).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
    expect(importLocal).toHaveBeenCalledWith("u1", {});
  });
});
