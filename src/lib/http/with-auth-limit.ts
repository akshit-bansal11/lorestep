import { AUTH_CREDENTIAL_PATHS, AUTH_ROUTE_PREFIX } from "@/constants/auth/auth";
import { RATE_LIMITS } from "@/constants/http/rate-limits";
import { clientIp } from "@/lib/http/client-ip";
import { enforceRateLimit } from "@/lib/http/enforce-rate-limit";
import { HttpError } from "@/lib/http/http-error";
import { fail } from "@/lib/http/respond";
import type { AuthRouteHandler } from "@/types/auth/auth";

function decoded(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/**
 * The request path after `/api/auth`, canonical: percent-decoded, lowercase, empty segments
 * dropped, so `/Sign-In//email/` and `/sign-in/email` share one bucket whatever the upstream
 * proxy normalises.
 */
export function canonicalAuthPath(url: string): string {
  const { pathname } = new URL(url);
  const rest = pathname.startsWith(AUTH_ROUTE_PREFIX)
    ? pathname.slice(AUTH_ROUTE_PREFIX.length)
    : pathname;
  return rest
    .split("/")
    .filter((segment) => segment !== "")
    .map((segment) => decoded(segment).toLowerCase())
    .join("/");
}

/**
 * Fronts the Neon Auth proxy with our own per-IP limiter (PLAN.md section 12, N-5, SEC-20): every
 * POST counts in `auth:<ip>`, and a credential path (`AUTH_CREDENTIAL_PATHS`) also in its own
 * `auth:<path>:<ip>` bucket. 429 past either cap, 403 when the client IP cannot be resolved.
 * Other methods go straight to `handler`.
 */
export function withAuthLimit(handler: AuthRouteHandler): AuthRouteHandler {
  return async (request, context) => {
    if (request.method !== "POST") return handler(request, context);
    try {
      const ip = clientIp(request.headers);
      if (ip === null) {
        throw new HttpError(403, "ip_unresolved", "This request could not be attributed.");
      }
      await enforceRateLimit(`auth:${ip}`, RATE_LIMITS.auth);
      const path = canonicalAuthPath(request.url);
      if (AUTH_CREDENTIAL_PATHS.includes(path)) {
        await enforceRateLimit(`auth:${path}:${ip}`, RATE_LIMITS.authCredential);
      }
    } catch (error) {
      return fail(error);
    }
    return handler(request, context);
  };
}
