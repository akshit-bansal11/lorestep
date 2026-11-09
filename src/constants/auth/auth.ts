/** The OAuth providers `AUTH_PROVIDERS` may name; Neon Auth holds their secrets (PLAN.md N-7). */
export const AUTH_PROVIDER_IDS = ["github", "google"] as const;

/** Where the Neon Auth proxy is mounted; the limiter keys on the path after it. */
export const AUTH_ROUTE_PREFIX = "/api/auth";

/**
 * Credential POST paths (canonical: lowercase, no leading, trailing or doubled slash) that get a
 * stricter per-path, per-IP bucket on top of the default one every `/api/auth/*` POST counts in
 * (N-5, SEC-20). Neon's own limits are undocumented, so this is one more layer, not proof. Taken
 * from the `@neon/auth` 0.8.2 endpoint list plus Better Auth's `set-password`.
 */
export const AUTH_CREDENTIAL_PATHS: readonly string[] = [
  "sign-in/email",
  "sign-in/email-otp",
  "sign-in/magic-link",
  "sign-up/email",
  "request-password-reset",
  "reset-password",
  "change-password",
  "set-password",
  "send-verification-email",
  "verify-email",
  "magic-link/verify",
  "email-otp/send-verification-otp",
  "email-otp/check-verification-otp",
  "email-otp/verify-email",
  "email-otp/reset-password",
];

/** The Dogear access token's audience is `APP_ORIGIN` + this path: sync only (PLAN.md N-4). */
export const DOGEAR_AUDIENCE_PATH = "/api/v1/sync";

/** Neon Auth's key set, relative to NEON_AUTH_BASE_URL. */
export const JWKS_PATH = "/.well-known/jwks.json";

/** A canonical uuid. A token `sub` must match before it reaches a `::uuid` query. */
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** jose codes for an unreachable or broken JWKS: the caller answers 503, never 401. */
export const JWKS_UNAVAILABLE_CODES: readonly string[] = [
  "ERR_JOSE_GENERIC",
  "ERR_JWKS_INVALID",
  "ERR_JWKS_TIMEOUT",
];
