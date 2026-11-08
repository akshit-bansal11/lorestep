/**
 * The client-IP header. Vercel overwrites `x-forwarded-for` with the connecting client's address
 * and does not forward a client-sent value (Vercel request-headers docs), so on Vercel it holds
 * exactly one address. Anything else is treated as unresolved (SEC-20).
 */
export const CLIENT_IP_HEADER = "x-forwarded-for";

/** Double-submit CSRF token (PLAN.md section 11 Q3). */
export const CSRF_COOKIE = "__Host-csrf";
export const CSRF_HEADER = "x-csrf-token";
export const CSRF_TOKEN_BYTES = 32;
/** 32 bytes as unpadded base64url. */
export const CSRF_TOKEN_PATTERN = /^[\w-]{43}$/;

/** RFC 7235: the auth scheme is case-insensitive. */
export const BEARER_SCHEME = /^bearer\s/i;
