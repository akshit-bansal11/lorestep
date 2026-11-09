import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { requireBearerUser } from "@/lib/auth/require-bearer-user";
import { HttpError } from "@/lib/http/http-error";

const { verifyDogearToken, createRemoteJWKSet } = vi.hoisted(() => ({
  verifyDogearToken: vi.fn(),
  createRemoteJWKSet: vi.fn(),
}));

vi.mock("@/lib/auth/verify-dogear-token", () => ({ verifyDogearToken }));
vi.mock("jose", () => ({ createRemoteJWKSet }));

const BASE = "https://ep-test.neonauth.test/neondb/auth";
const USER_ID = "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b";
const KEYS = () => undefined;

const request = (headers: Record<string, string> = {}) =>
  new Request("https://lorestep.test/api/v1/sync", { headers });

async function statusOf(promise: Promise<unknown>) {
  const error = await promise.catch((caught: unknown) => caught);
  return error instanceof HttpError ? `${error.status} ${error.code}` : "resolved";
}

describe("requireBearerUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEON_AUTH_BASE_URL", BASE);
    vi.stubEnv("APP_ORIGIN", "https://lorestep.test");
    vi.stubEnv("DOGEAR_OAUTH_CLIENT_ID", "dogear-client");
    createRemoteJWKSet.mockReturnValue(KEYS);
    verifyDogearToken.mockResolvedValue(USER_ID);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("verifies the bearer JWT against Neon's JWKS, the sync audience and the client id", async () => {
    vi.stubEnv("NEON_AUTH_ISSUER", "https://issuer.test");

    const user = await requireBearerUser(request({ authorization: "Bearer a.b.c" }));

    expect(user).toEqual({ userId: USER_ID, via: "bearer" });
    expect(verifyDogearToken).toHaveBeenCalledWith("a.b.c", {
      getKey: KEYS,
      issuer: "https://issuer.test",
      audience: "https://lorestep.test/api/v1/sync",
      clientId: "dogear-client",
    });
    expect(createRemoteJWKSet).toHaveBeenCalledWith(new URL(`${BASE}/.well-known/jwks.json`));
  });

  it("uses the Auth base URL as issuer when NEON_AUTH_ISSUER is unset", async () => {
    await requireBearerUser(request({ authorization: "bearer a.b.c" }));

    expect(verifyDogearToken.mock.calls[0]?.[1]).toMatchObject({ issuer: BASE });
  });

  it("refuses a session cookie or a malformed header with 401, verifying nothing", async () => {
    const cases: Record<string, string>[] = [
      { cookie: "__Secure-neon-auth.session_token=abc" },
      { authorization: "Basic dTpw" },
      { authorization: "Bearer" },
      { authorization: "Bearer a b" },
    ];
    for (const headers of cases) {
      expect(await statusOf(requireBearerUser(request(headers)))).toBe("401 unauthorized");
    }
    expect(verifyDogearToken).not.toHaveBeenCalled();
  });

  it("passes the verifier's 401 and 503 through", async () => {
    const authorization = "Bearer a.b.c";
    verifyDogearToken.mockRejectedValueOnce(new HttpError(401, "unauthorized", "x"));
    expect(await statusOf(requireBearerUser(request({ authorization })))).toBe("401 unauthorized");

    verifyDogearToken.mockRejectedValueOnce(new HttpError(503, "auth_unavailable", "x"));
    expect(await statusOf(requireBearerUser(request({ authorization })))).toBe(
      "503 auth_unavailable",
    );
  });
});
