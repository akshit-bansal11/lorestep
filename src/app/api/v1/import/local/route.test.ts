import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/v1/import/local/route";

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

  it("refuses a bearer token or a Dogear session with 403 and imports nothing", async () => {
    for (const caller of [
      { userId: "u1", via: "bearer", client: "browser", sessionId: "s1" },
      { userId: "u1", via: "bearer", client: "dogear", sessionId: "s2" },
    ]) {
      requireUser.mockResolvedValueOnce(caller);

      const response = await post();

      expect(response.status).toBe(403);
      expect((await response.json()).error.code).toBe("session_required");
    }
    expect(importLocal).not.toHaveBeenCalled();
    expect(assertSameOrigin).not.toHaveBeenCalled();
  });

  it("CSRF-checks a browser session before importing", async () => {
    requireUser.mockResolvedValueOnce({
      userId: "u1",
      via: "session",
      client: "browser",
      sessionId: "s3",
    });
    importLocal.mockResolvedValueOnce({ inserted: 0, skipped: 0 });

    const response = await post();

    expect(assertSameOrigin).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
    expect(importLocal).toHaveBeenCalledWith("u1", {});
  });
});
