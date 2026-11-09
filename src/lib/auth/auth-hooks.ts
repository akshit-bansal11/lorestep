import { APIError, createAuthMiddleware } from "better-auth/api";
import { isPasswordCompromised } from "better-auth/plugins/haveibeenpwned";

import {
  DEVICE_TOKEN_PATH,
  DOGEAR_AUTH_PATHS,
  DOGEAR_SESSION_LABEL,
  NEW_PASSWORD_FIELDS,
} from "@/constants/auth/auth";
import { mailCredentials } from "@/lib/auth/auth-env";
import { sessionTokenFrom } from "@/lib/auth/session-token-from-headers";
import { signSessionToken } from "@/lib/auth/sign-session-token";

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

/**
 * A Dogear session may only read who it is and sign itself out (DECISIONS.md, sessions carry a
 * client column). On any other path, a request whose credential names a `client = 'dogear'` row
 * gets 403, whether the token came as a bearer header or as the session cookie. Better-Auth runs
 * this user hook before the bearer plugin's, so the token is read from the headers here.
 * ponytail: one session lookup per auth request that carries a credential; fine at this traffic.
 */
export async function rejectDogearSession(
  path: string,
  headers: Headers | undefined,
  findSession: (token: string) => Promise<{ session: object } | null>,
): Promise<void> {
  if (DOGEAR_AUTH_PATHS.includes(path)) return;
  const token = sessionTokenFrom(headers);
  if (token === null) return;
  const found = await findSession(token);
  if (found !== null && Reflect.get(found.session, "client") === "dogear") {
    throw new APIError("FORBIDDEN", {
      code: "dogear_forbidden",
      message: "Do this from the Lorestep website.",
    });
  }
}

/** Runs before every Better-Auth endpoint. */
export const beforeAuthHook = createAuthMiddleware(async (ctx) => {
  await rejectDogearSession(ctx.path, ctx.headers, (token) =>
    ctx.context.internalAdapter.findSession(token),
  );

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

/**
 * Runs after every Better-Auth endpoint. On `/device/token` (Dogear's code exchange) it swaps the
 * raw `access_token` for its signed form, which is what `bearer({ requireSignature: true })`
 * accepts (OPEN_ITEMS R1), and marks the new session row `client = 'dogear'`, which is what
 * authorization reads (require-user.ts). The user-agent label is for `/account` display only.
 * Errors (pending, slow_down, denied) arrive as APIError and pass through untouched.
 */
export const afterAuthHook = createAuthMiddleware(async (ctx) => {
  if (ctx.path !== DEVICE_TOKEN_PATH) return;
  const returned = ctx.context.returned;
  if (typeof returned !== "object" || returned === null || returned instanceof Error) return;
  const token: unknown = Reflect.get(returned, "access_token");
  if (typeof token !== "string" || token.includes(".")) return;

  await ctx.context.internalAdapter.updateSession(token, {
    client: "dogear",
    userAgent: DOGEAR_SESSION_LABEL,
  });
  ctx.context.returned = { ...returned, access_token: signSessionToken(token, ctx.context.secret) };
});
