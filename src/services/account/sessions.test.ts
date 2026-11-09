import { beforeEach, describe, expect, it, vi } from "vitest";

import { HttpError } from "@/lib/http/http-error";
import { listDeviceSessions, revokeDeviceSession } from "@/services/account/sessions";

const { listSessions, revokeSession } = vi.hoisted(() => ({
  listSessions: vi.fn(),
  revokeSession: vi.fn(),
}));

vi.mock("@/lib/auth/neon-auth", () => ({ neonAuth: () => ({ listSessions, revokeSession }) }));

const OLD = {
  id: "s1",
  token: "token-1",
  userAgent: "Firefox",
  createdAt: "2026-11-01T00:00:00.000Z",
  expiresAt: "2026-12-01T00:00:00.000Z",
};
const NEW = {
  id: "s2",
  token: "token-2",
  userAgent: undefined,
  createdAt: new Date("2026-11-05T00:00:00.000Z"),
  expiresAt: new Date("2026-12-05T00:00:00.000Z"),
};

describe("account sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listSessions.mockResolvedValue({ data: [OLD, NEW], error: null });
    revokeSession.mockResolvedValue({ data: { status: true }, error: null });
  });

  it("lists display fields only, newest first, never a token", async () => {
    const sessions = await listDeviceSessions();

    expect(sessions).toEqual([
      {
        id: "s2",
        userAgent: null,
        createdAt: "2026-11-05T00:00:00.000Z",
        expiresAt: "2026-12-05T00:00:00.000Z",
      },
      { id: "s1", userAgent: "Firefox", createdAt: OLD.createdAt, expiresAt: OLD.expiresAt },
    ]);
    expect(JSON.stringify(sessions)).not.toContain("token");
  });

  it("revokes a listed session by its token", async () => {
    await expect(revokeDeviceSession("s1")).resolves.toBe(true);
    expect(revokeSession).toHaveBeenCalledWith({ token: "token-1" });
  });

  it("refuses an id that is not in the caller's own list", async () => {
    await expect(revokeDeviceSession("someone-elses")).resolves.toBe(false);
    expect(revokeSession).not.toHaveBeenCalled();
  });

  it("answers 503 when Neon Auth reports an error", async () => {
    listSessions.mockResolvedValueOnce({ data: null, error: { status: 500, message: "down" } });

    const error = await listDeviceSessions().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(HttpError);
    expect(error).toMatchObject({ status: 503, code: "auth_unavailable" });
  });
});
