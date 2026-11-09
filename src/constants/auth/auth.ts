/** Absolute session lifetime: 30 days, never extended (PLAN.md section 11 Q4, SEC-08). */
export const SESSION_TTL_SEC = 60 * 60 * 24 * 30;

/** Password-reset token lifetime (SEC-09 wants a recorded finite value; DECISIONS.md). */
export const RESET_TOKEN_TTL_SEC = 60 * 60;

/** The only device-authorization client Lorestep accepts: the Dogear extension. */
export const DOGEAR_CLIENT_ID = "dogear";

/**
 * Who holds a session row. Authorization reads this column, never the transport: a Dogear token
 * is byte-identical to a cookie value, so how it arrives proves nothing (DECISIONS.md).
 */
export const SESSION_CLIENTS = ["browser", "dogear"] as const;

/** The user-agent a Dogear session is stored with, so `/account` names it. Display only. */
export const DOGEAR_SESSION_LABEL = "Dogear (Chrome)";

/** Longest `?user_code=` the `/device` page passes on (Better-Auth's codes are 8 characters). */
export const DEVICE_USER_CODE_MAX = 32;

/** The Better-Auth endpoint that hands a paired device its token. */
export const DEVICE_TOKEN_PATH = "/device/token";

/**
 * The only Better-Auth endpoints a Dogear session may call: "Signed in as", sign-out, and the
 * pairing pair (which carry no session yet). Every other `/api/auth/*` path refuses it with 403.
 */
export const DOGEAR_AUTH_PATHS: readonly string[] = [
  "/get-session",
  "/sign-out",
  "/device/code",
  DEVICE_TOKEN_PATH,
];

/** Better-Auth endpoints whose body carries a new password, mapped to that body field. */
export const NEW_PASSWORD_FIELDS: Readonly<Record<string, string>> = {
  "/sign-up/email": "password",
  "/change-password": "newPassword",
  "/reset-password": "newPassword",
  "/set-password": "newPassword",
};

/** Stricter Better-Auth limiter rules for the credential endpoints, per client IP. */
export const AUTH_RATE_RULES = {
  "/sign-in/email": { window: 60, max: 5 },
  "/sign-up/email": { window: 60 * 10, max: 3 },
  "/request-password-reset": { window: 60 * 60, max: 3 },
  "/reset-password": { window: 60 * 10, max: 5 },
  "/change-password": { window: 60 * 10, max: 5 },
};

export const RESEND_EMAILS_URL = "https://api.resend.com/emails";

export const RESET_EMAIL_SUBJECT = "Reset your Lorestep password";
export const RESET_EMAIL_TEXT =
  "Reset your password with this link. It expires in one hour.\n\n{url}\n\nIf you did not ask for this, ignore this email.";
