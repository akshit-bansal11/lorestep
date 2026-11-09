import { createRemoteJWKSet, type JWTVerifyGetKey } from "jose";

import { EXTENSION_AUDIENCE_PATH, JWKS_PATH } from "@/constants/auth/auth";
import { BEARER_TOKEN } from "@/constants/http/http";
import { appOrigin, authIssuer, requiredEnv } from "@/lib/auth/auth-env";
import { verifyExtensionToken } from "@/lib/auth/verify-extension-token";
import { HttpError } from "@/lib/http/http-error";
import type { AuthedUser } from "@/types/auth/auth";

let jwks: JWTVerifyGetKey | undefined;

/** Neon Auth's key set, built on first use (never at import) and cached by jose across requests. */
function extensionKeys(): JWTVerifyGetKey {
  jwks ??= createRemoteJWKSet(new URL(`${requiredEnv("NEON_AUTH_BASE_URL")}${JWKS_PATH}`));
  return jwks;
}

/**
 * The caller of the sync routes, by extension bearer JWT only (PLAN.md section 12, N-4). A session
 * cookie is never read here, so a request without `Authorization: Bearer` is 401. A bearer
 * request carries no ambient credential, so sync needs no CSRF check and sends no CORS headers
 * (D-10). Token faults are 401; an unreachable key set is 503 (`verifyExtensionToken`).
 */
export async function requireBearerUser(request: Request): Promise<AuthedUser> {
  const match = BEARER_TOKEN.exec(request.headers.get("authorization") ?? "");
  if (match?.[1] === undefined) {
    throw new HttpError(401, "unauthorized", "Sign in to Lorestep for Chrome again.");
  }
  const userId = await verifyExtensionToken(match[1], {
    getKey: extensionKeys(),
    issuer: authIssuer(),
    audience: `${appOrigin()}${EXTENSION_AUDIENCE_PATH}`,
    clientId: requiredEnv("EXTENSION_OAUTH_CLIENT_ID"),
  });
  return { userId, via: "bearer" };
}
