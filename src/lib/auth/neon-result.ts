import { HttpError } from "@/lib/http/http-error";

/** Neon Auth (or its key set) did not answer: fail closed (BE-06), never as signed out. */
export const authUnavailable = () =>
  new HttpError(503, "auth_unavailable", "Sign-in is unavailable. Try again shortly.");

/**
 * The data of a Neon Auth server call. Transport and server failures come back in `error`, not
 * as a throw, so any error (or a missing payload) becomes 503 `auth_unavailable`.
 */
export function neonData<T>(result: { data: T | null; error: unknown }): T {
  if (result.error !== null && result.error !== undefined) throw authUnavailable();
  if (result.data === null) throw authUnavailable();
  return result.data;
}
