import { RATE_LIMITS } from "@/constants/http/rate-limits";
import { githubCredentials, googleCredentials, mailCredentials } from "@/lib/auth/auth-env";
import { rateLimit } from "@/lib/db/rate-limit";
import { clientIp } from "@/lib/http/client-ip";
import { HttpError } from "@/lib/http/http-error";
import { fail, ok } from "@/lib/http/respond";

/** Which sign-in options exist here, so the UI shows only working buttons. Public, IP-limited. */
export async function GET(request: Request) {
  try {
    const ip = clientIp(request.headers);
    if (ip === null) {
      throw new HttpError(403, "ip_unresolved", "This request could not be attributed.");
    }

    const { limit, windowSec } = RATE_LIMITS.authProviders;
    const { allowed, retryAfterSec } = await rateLimit(`auth-providers:${ip}`, limit, windowSec);
    if (!allowed) {
      throw new HttpError(429, "rate_limited", "Too many requests. Try again shortly.", {
        "Retry-After": String(retryAfterSec),
      });
    }

    return ok({
      github: githubCredentials() !== null,
      google: googleCredentials() !== null,
      reset: mailCredentials() !== null,
    });
  } catch (error) {
    return fail(error);
  }
}
