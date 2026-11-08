import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/v1/sync/sign-out/route";
import { HttpError } from "@/lib/http/http-error";

const { requireUser, rateLimit, revokeDeviceSession } = vi.hoisted(() => ({
  requireUser: vi.fn(),
  rateLimit: vi.fn(),
  revokeDeviceSession: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({ requireUser }));
vi.mock("@/lib/db/rate-limit", () => ({ rateLimit }));
vi.mock("@/services/account/sessions", () => ({ revokeDeviceSession }));

const signOut = () =>
  POST(
    new Request("https://lorestep.test/api/v1/sync/sign-out", {
      method: "POST",
      headers: { authorization: "Bearer token.signature" },
    }),
  );

describe("POST /api/v1/sync/sign-out", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({
      userId: "user-a",
      via: "bearer",
      client: "dogear",
      sessionId: "session-1",
    });
    rateLimit.mockResolvedValue({ allowed: true, retryAfterSec: 30 });
    revokeDeviceSession.mockResolvedValue(true);
  });

  it("revokes exactly the calling session, scoped to its owner, and answers 204", async () => {
    const response = await signOut();

    expect(response.status).toBe(204);
    expect(revokeDeviceSession).toHaveBeenCalledExactlyOnceWith("user-a", "session-1");
    expect(rateLimit).toHaveBeenCalledWith("sync-signout:user-a", 10, 60);
  });

  it("still answers 204 when the row is already gone", async () => {
    revokeDeviceSession.mockResolvedValue(false);

    expect((await signOut()).status).toBe(204);
  });

  it("refuses a browser session cookie with 403 and revokes nothing", async () => {
    requireUser.mockResolvedValue({
      userId: "user-a",
      via: "session",
      client: "browser",
      sessionId: "session-2",
    });

    const response = await signOut();

    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe("bearer_required");
    expect(revokeDeviceSession).not.toHaveBeenCalled();
  });

  it("answers 401 for a revoked token and 429 past the limit", async () => {
    requireUser.mockRejectedValueOnce(new HttpError(401, "unauthorized", "Sign in to continue."));
    expect((await signOut()).status).toBe(401);

    rateLimit.mockResolvedValueOnce({ allowed: false, retryAfterSec: 30 });
    expect((await signOut()).status).toBe(429);
    expect(revokeDeviceSession).not.toHaveBeenCalled();
  });
});
