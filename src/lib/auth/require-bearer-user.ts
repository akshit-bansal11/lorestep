import { requireUser } from "@/lib/auth/require-user";
import { HttpError } from "@/lib/http/http-error";

/**
 * The caller's id, by signed bearer token only. The sync routes refuse a session cookie with 403:
 * a bearer request carries no ambient credential, so they need no CSRF check and send no CORS
 * headers (D-10); the extension's service worker is their only client.
 */
export async function requireBearerUser(request: Request): Promise<string> {
  const { userId, via } = await requireUser(request);
  if (via !== "bearer") {
    throw new HttpError(403, "bearer_required", "Sync is only for the Dogear extension.");
  }
  return userId;
}
