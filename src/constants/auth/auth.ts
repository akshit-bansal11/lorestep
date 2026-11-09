/** The OAuth providers `AUTH_PROVIDERS` may name; Neon Auth holds their secrets (PLAN.md N-7). */
export const AUTH_PROVIDER_IDS = ["github", "google"] as const;

/**
 * The only `/api/auth/*` POST paths (canonical: segments lowercased, joined by `/`) exempt from
 * the strict per-path bucket (N-5, SEC-20). Fail closed: every other POST, including any unknown
 * spelling, counts in the strict bucket on top of the default one. Kept minimal on purpose:
 * sign-out and the extension consent submit, the two non-credential POSTs the UI makes.
 */
export const AUTH_NON_CREDENTIAL_PATHS: readonly string[] = ["sign-out", "oauth2/consent"];

/**
 * The only `/api/auth/*` paths the proxy forwards, per method, in canonical spelling (the
 * forwarded segments must already be canonical). Everything else is 404 before any upstream
 * call: the SDK's upstream `fetch` follows redirects server-side, so an open path list (for
 * example `verify-email`, which 302s to a caller-chosen `callbackURL`) is a server-side fetch on
 * our origin. Derived from every `authClient` call in `src/**` plus what `@neon/auth@0.8.2`'s
 * client fires on its own (`useSession` = GET `get-session`). Server-side calls (`getSession`,
 * `oauth2.publicClient`, `listSessions`, `signOut`) go to `NEON_AUTH_BASE_URL` directly, and
 * provider callbacks, reset links and the extension's authorize/token never touch this proxy.
 */
export const AUTH_PROXY_PATHS: Readonly<Record<string, readonly string[]>> = {
  GET: ["get-session"],
  POST: [
    "sign-in/email",
    "sign-up/email",
    "sign-out",
    "sign-in/social",
    "request-password-reset",
    "reset-password",
    "oauth2/continue",
    "oauth2/consent",
  ],
};

/** Characters a decoded auth path segment may never contain (traversal and double encoding). */
export const AUTH_SEGMENT_FORBIDDEN = /[/\\%]/;

/** The extension access token's audience is `APP_ORIGIN` + this path: sync only (PLAN.md N-4). */
export const EXTENSION_AUDIENCE_PATH = "/api/v1/sync";

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
