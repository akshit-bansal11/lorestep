/** The OAuth providers `AUTH_PROVIDERS` may name; Neon Auth holds their secrets (PLAN.md N-7). */
export const AUTH_PROVIDER_IDS = ["github", "google"] as const;

/**
 * The `/api/auth/*` POST paths our own per-IP limiter fronts before Neon Auth sees them (N-5,
 * SEC-20): Neon's own limits are undocumented, so this is one more layer, not proof.
 */
export const AUTH_LIMITED_PATHS: readonly string[] = [
  "/sign-in/email",
  "/sign-up/email",
  "/request-password-reset",
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
