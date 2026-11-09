import { errors, type JWTPayload, jwtVerify } from "jose";

import { JWKS_UNAVAILABLE_CODES, UUID_RE } from "@/constants/auth/auth";
import { HttpError } from "@/lib/http/http-error";
import type { DogearTokenDeps } from "@/types/auth/auth";

const unauthorized = () => new HttpError(401, "unauthorized", "Sign in to Dogear again.");

/**
 * The user id a Dogear access token was issued to, or HttpError: 401 for any token fault, 503
 * `auth_unavailable` when the JWKS cannot be fetched (fail closed, BE-06). Pins `EdDSA`, checks
 * `iss`, `aud`, `exp`, `client_id` and a uuid `sub` (PLAN.md section 12, N-4). The key resolver is
 * injected, so tests need no network.
 */
export async function verifyDogearToken(token: string, deps: DogearTokenDeps): Promise<string> {
  if (token === "") throw unauthorized();

  let payload: JWTPayload;
  try {
    ({ payload } = await jwtVerify(token, deps.getKey, {
      issuer: deps.issuer,
      audience: deps.audience,
      algorithms: ["EdDSA"],
      requiredClaims: ["exp", "sub"],
    }));
  } catch (error) {
    if (error instanceof errors.JOSEError && !JWKS_UNAVAILABLE_CODES.includes(error.code)) {
      throw unauthorized();
    }
    throw new HttpError(503, "auth_unavailable", "Sign-in is unavailable. Try again shortly.");
  }

  if (payload.client_id !== deps.clientId) throw unauthorized();
  if (payload.sub === undefined || !UUID_RE.test(payload.sub)) throw unauthorized();
  return payload.sub;
}
