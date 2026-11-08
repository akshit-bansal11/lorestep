import { requireUser } from "@/lib/auth/require-user";
import { HttpError } from "@/lib/http/http-error";

/**
 * The signed-in caller's id, by browser session only. Account routes (export, erase, device
 * sign-out) refuse a bearer token with 403, so a token held by an extension can never read or
 * destroy the whole account.
 */
export async function requireSessionUser(request: Request): Promise<string> {
  const { userId, via } = await requireUser(request);
  if (via !== "session") {
    throw new HttpError(403, "session_required", "Do this from the Lorestep website.");
  }
  return userId;
}
