import { AUTH_LIMITED_PATHS } from "@/constants/auth/auth";
import { RATE_LIMITS } from "@/constants/http/rate-limits";
import { clientIp } from "@/lib/http/client-ip";
import { enforceRateLimit } from "@/lib/http/enforce-rate-limit";
import { HttpError } from "@/lib/http/http-error";
import { fail } from "@/lib/http/respond";
import type { AuthRouteHandler } from "@/types/auth/auth";

/**
 * Fronts the Neon Auth proxy with our own per-IP limiter on the credential endpoints
 * (`AUTH_LIMITED_PATHS`, PLAN.md section 12, N-5, SEC-20): 429 past the cap, 403 when the client
 * IP cannot be resolved. Every other path goes straight to `handler`.
 */
export function withAuthLimit(handler: AuthRouteHandler): AuthRouteHandler {
  return async (request, context) => {
    const { path } = await context.params;
    if (AUTH_LIMITED_PATHS.includes(`/${path.join("/")}`)) {
      try {
        const ip = clientIp(request.headers);
        if (ip === null) {
          throw new HttpError(403, "ip_unresolved", "This request could not be attributed.");
        }
        await enforceRateLimit(`auth:${ip}`, RATE_LIMITS.auth);
      } catch (error) {
        return fail(error);
      }
    }
    return handler(request, context);
  };
}
