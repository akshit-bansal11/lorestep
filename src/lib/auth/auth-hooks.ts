import { APIError, createAuthMiddleware } from "better-auth/api";
import { isPasswordCompromised } from "better-auth/plugins/haveibeenpwned";

import { NEW_PASSWORD_FIELDS } from "@/constants/auth/auth";
import { mailCredentials } from "@/lib/auth/auth-env";

/** The new password a Better-Auth request carries, or null when the path sets none. */
export function newPasswordIn(path: string, body: unknown): string | null {
  const field = NEW_PASSWORD_FIELDS[path];
  if (field === undefined || typeof body !== "object" || body === null) return null;
  const value: unknown = Reflect.get(body, field);
  return typeof value === "string" ? value : null;
}

/**
 * SEC-06: every new or changed password is checked against Have I Been Pwned (k-anonymity: only
 * five SHA-1 hex characters leave the server). Fails OPEN, logged, when the service cannot answer.
 * The `haveIBeenPwned` plugin is not used because it fails closed (a 500 on every sign-up while
 * the service is down) and offers no option to change that.
 */
export async function rejectPwnedPassword(password: string) {
  let compromised = false;
  try {
    compromised = await isPasswordCompromised(password);
  } catch (error) {
    console.warn("Have I Been Pwned unreachable; password accepted unchecked (fail open)", error);
  }
  if (compromised) {
    throw new APIError("BAD_REQUEST", {
      code: "PASSWORD_COMPROMISED",
      message: "This password has appeared in a data breach. Choose a different one.",
    });
  }
}

/** Runs before every Better-Auth endpoint. */
export const beforeAuthHook = createAuthMiddleware(async (ctx) => {
  if (ctx.path === "/request-password-reset" && mailCredentials() === null) {
    throw new APIError("SERVICE_UNAVAILABLE", {
      code: "reset_unavailable",
      message: "Password reset by email is not available right now.",
    });
  }

  const password = newPasswordIn(ctx.path, ctx.body);
  if (password !== null) await rejectPwnedPassword(password);

  // SEC-08: a password change always ends every other session, whatever the client asked for.
  if (ctx.path === "/change-password") {
    return { context: { ...ctx, body: { ...ctx.body, revokeOtherSessions: true } } };
  }
});
