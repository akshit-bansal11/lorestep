import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/v1/sync/push/route";
import { GET } from "@/app/api/v1/sync/route";
import { HttpError } from "@/lib/http/http-error";

const { verifyExtensionToken, getSession, rateLimit, pullChanges, pushMarks } = vi.hoisted(() => ({
  verifyExtensionToken: vi.fn(),
  getSession: vi.fn(),
  rateLimit: vi.fn(),
  pullChanges: vi.fn(),
  pushMarks: vi.fn(),
}));

// The real bearer guard runs; only the JWT check, the key set and the services are stubbed.
vi.mock("@/lib/auth/verify-extension-token", () => ({ verifyExtensionToken }));
vi.mock("jose", () => ({ createRemoteJWKSet: () => () => undefined }));
vi.mock("@/lib/auth/neon-auth", () => ({ neonAuth: () => ({ getSession }) }));
vi.mock("@/lib/db/rate-limit", () => ({ rateLimit }));
vi.mock("@/services/sync/pull", () => ({ pullChanges }));
vi.mock("@/services/sync/push", () => ({ pushMarks }));

const USER_ID = "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b";
const URL_BASE = "https://lorestep.test/api/v1/sync";

const pull = (headers: Record<string, string>) => GET(new Request(URL_BASE, { headers }));
const push = (headers: Record<string, string>) =>
  POST(
    new Request(`${URL_BASE}/push`, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify({ marks: [] }),
    }),
  );

describe("/api/v1/sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEON_AUTH_BASE_URL", "https://ep-test.neonauth.test/neondb/auth");
    vi.stubEnv("APP_ORIGIN", "https://lorestep.test");
    vi.stubEnv("EXTENSION_OAUTH_CLIENT_ID", "extension-client");
    rateLimit.mockResolvedValue({ allowed: true, retryAfterSec: 30 });
    verifyExtensionToken.mockResolvedValue(USER_ID);
    pullChanges.mockResolvedValue({ changes: [], cursor: null });
    pushMarks.mockResolvedValue([]);
  });

  it("pulls for the token's user", async () => {
    const response = await pull({ authorization: "Bearer a.b.c" });

    expect(response.status).toBe(200);
    expect(pullChanges.mock.calls[0]?.[0]).toBe(USER_ID);
    expect(rateLimit.mock.calls[0]?.[0]).toBe(`sync-pull:${USER_ID}`);
  });

  it("refuses a session cookie on pull and push with 401, never reading the session", async () => {
    const cookie = { cookie: "__Secure-neon-auth.session_token=abc" };

    expect((await pull(cookie)).status).toBe(401);
    expect((await push(cookie)).status).toBe(401);
    expect(getSession).not.toHaveBeenCalled();
    expect(pullChanges).not.toHaveBeenCalled();
    expect(pushMarks).not.toHaveBeenCalled();
  });

  it("answers 503 when the key set is unreachable", async () => {
    verifyExtensionToken.mockRejectedValueOnce(new HttpError(503, "auth_unavailable", "Down."));

    expect((await push({ authorization: "Bearer a.b.c" })).status).toBe(503);
    expect(pushMarks).not.toHaveBeenCalled();
  });
});
