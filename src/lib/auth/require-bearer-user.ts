import { requireUser } from "@/lib/auth/require-user";
import { HttpError } from "@/lib/http/http-error";
import type { AuthedUser } from "@/types/auth/auth";

/**
 * The caller, by signed bearer token only. The sync routes refuse a session cookie with 403:
 * a bearer request carries no ambient credential, so they need no CSRF check and send no CORS
 * headers (D-10); the extension's service worker is their only client.
 */
export async function requireBearerUser(request: Request): Promise<AuthedUser> {
  const user = await requireUser(request);
  if (user.via !== "bearer") {
    throw new HttpError(403, "bearer_required", "Sync is only for the Dogear extension.");
  }
  return user;
}
