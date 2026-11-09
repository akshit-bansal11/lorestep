import { AUTH_NON_CREDENTIAL_PATHS, AUTH_SEGMENT_FORBIDDEN } from "@/constants/auth/auth";
import { RATE_LIMITS } from "@/constants/http/rate-limits";
import { clientIp } from "@/lib/http/client-ip";
import { enforceRateLimit } from "@/lib/http/enforce-rate-limit";
import { HttpError } from "@/lib/http/http-error";
import { fail } from "@/lib/http/respond";
import type { AuthRouteHandler } from "@/types/auth/auth";

const badPath = () => new HttpError(400, "invalid_path", "That auth path is not valid.");

function decodedSegment(segment: string): string {
  let decoded: string;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    throw badPath();
  }
  if (decoded === "" || decoded === "." || decoded === "..") throw badPath();
  if (AUTH_SEGMENT_FORBIDDEN.test(decoded)) throw badPath();
  return decoded.toLowerCase();
}

/**
 * The limiter key for the exact `path` segments the handler forwards upstream: each segment
 * percent-decoded and lowercased, joined by `/`. Throws 400 `invalid_path` for an empty segment,
 * `.` or `..`, a segment that does not decode, or one that decodes to `/`, `\` or `%` (fail closed:
 * no spelling can alias another path).
 */
export function canonicalAuthPath(path: readonly string[]): string {
  if (path.length === 0) throw badPath();
  return path.map(decodedSegment).join("/");
}

/**
 * Fronts the Neon Auth proxy with our own per-IP limiter (PLAN.md section 12, N-5, SEC-20). Every
 * POST counts in `auth:<ip>`; every POST whose path is not in `AUTH_NON_CREDENTIAL_PATHS`, so any
 * credential or unknown path, also counts in the strict `auth:<path>:<ip>` bucket. 429 past either
 * cap, 403 when the client IP cannot be resolved, 400 for a malformed path. Other methods go
 * straight to `handler`.
 */
export function withAuthLimit(handler: AuthRouteHandler): AuthRouteHandler {
  return async (request, context) => {
    if (request.method !== "POST") return handler(request, context);
    try {
      const path = canonicalAuthPath((await context.params).path);
      const ip = clientIp(request.headers);
      if (ip === null) {
        throw new HttpError(403, "ip_unresolved", "This request could not be attributed.");
      }
      await enforceRateLimit(`auth:${ip}`, RATE_LIMITS.auth);
      if (!AUTH_NON_CREDENTIAL_PATHS.includes(path)) {
        await enforceRateLimit(`auth:${path}:${ip}`, RATE_LIMITS.authCredential);
      }
    } catch (error) {
      return fail(error);
    }
    return handler(request, context);
  };
}
