import { BEARER_SCHEME } from "@/constants/http/http";
import { getAuth } from "@/lib/auth/auth";
import { HttpError } from "@/lib/http/http-error";
import type { AuthedUser } from "@/types/auth/auth";

/**
 * The signed-in caller, by session cookie or by signed bearer token (the `bearer` plugin turns a
 * valid `Authorization: Bearer` into the session lookup). Throws HttpError 401 when neither holds.
 *
 * Fails CLOSED (BE-06): if the auth store is unreachable `getSession` throws and the route answers
 * 500, never as signed in. A request carrying `Authorization` is reported as `bearer`: a browser
 * cannot attach that header cross-site without a CORS preflight, which Lorestep never grants.
 */
export async function requireUser(request: Request): Promise<AuthedUser> {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (session === null) {
    throw new HttpError(401, "unauthorized", "Sign in to continue.");
  }
  const bearer = BEARER_SCHEME.test(request.headers.get("authorization") ?? "");
  return { userId: session.user.id, via: bearer ? "bearer" : "session" };
}
