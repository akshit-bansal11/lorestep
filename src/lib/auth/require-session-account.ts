import { BEARER_SCHEME } from "@/constants/http/http";
import { neonAuth } from "@/lib/auth/neon-auth";
import { authUnavailable } from "@/lib/auth/neon-result";
import { HttpError } from "@/lib/http/http-error";
import type { SessionAccount } from "@/types/auth/auth";

/**
 * The signed-in browser user, by Neon Auth session cookie only (PLAN.md section 12, N-4). A
 * request carrying `Authorization: Bearer` is refused with 401: a Dogear token is a sync-only
 * JWT, never a session. No session = 401. Neon Auth unreachable, or answering an error, = 503
 * `auth_unavailable` (fail closed, BE-06), never treated as signed out.
 */
export async function requireSessionAccount(request: Request): Promise<SessionAccount> {
  if (BEARER_SCHEME.test(request.headers.get("authorization") ?? "")) {
    throw new HttpError(401, "unauthorized", "Sign in on the Lorestep website.");
  }

  const result = await neonAuth()
    .getSession()
    .catch(() => {
      throw authUnavailable();
    });
  if (result.error !== null && result.error !== undefined) throw authUnavailable();

  const user = result.data?.user;
  if (user === null || user === undefined) {
    throw new HttpError(401, "unauthorized", "Sign in to continue.");
  }
  return { userId: user.id, email: user.email, name: user.name };
}
