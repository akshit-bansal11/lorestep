import { BEARER_SCHEME } from "@/constants/http/http";
import type { CredentialScan } from "@/types/auth/auth";

/** Every cookie name Better-Auth may read a session from ends with this, prefixed or not. */
const SESSION_COOKIE_SUFFIX = "session_token";

/** A request carrying more session credentials than this is refused (lookup amplification). */
const MAX_CREDENTIALS = 3;

/** `token.signature` once decoded: Better-Auth tokens, then a 44-character base64 HMAC. */
const SIGNED_TOKEN = /^([A-Za-z0-9_-]+)\.[A-Za-z0-9+/]{43}=$/;

/**
 * Every raw session token a request carries: the bearer header AND every session-token cookie
 * (any prefix, any count), normalised the way better-call reads cookies (trim, one pair of
 * surrounding quotes, URL-decode). Checking all of them, not the first found, stops a harmless
 * credential being shown to the Dogear guard while Better-Auth resolves another (parser
 * differential). Fails closed: a malformed session credential, or more than MAX_CREDENTIALS of
 * them, sets `refuse`. Signatures are NOT verified: use this only to refuse a request, never to
 * authenticate one.
 */
export function sessionTokensFrom(headers: Headers | undefined): CredentialScan {
  if (headers === undefined) return { tokens: [], refuse: false };
  const values: string[] = [];

  const authorization = headers.get("authorization") ?? "";
  if (BEARER_SCHEME.test(authorization)) values.push(authorization.replace(BEARER_SCHEME, ""));

  for (const pair of (headers.get("cookie") ?? "").split(";")) {
    const eq = pair.indexOf("=");
    if (eq > 0 && pair.slice(0, eq).trim().endsWith(SESSION_COOKIE_SUFFIX)) {
      values.push(pair.slice(eq + 1));
    }
  }
  if (values.length > MAX_CREDENTIALS) return { tokens: [], refuse: true };

  const tokens: string[] = [];
  for (const value of values) {
    const token = unsignedToken(value);
    if (token === null) return { tokens: [], refuse: true };
    if (!tokens.includes(token)) tokens.push(token);
  }
  return { tokens, refuse: false };
}

/** Normalised `token.signature` → `token`; null when the value is malformed. */
function unsignedToken(raw: string): string | null {
  let value = raw.trim();
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    value = value.slice(1, -1);
  }
  try {
    value = decodeURIComponent(value);
  } catch {
    return null;
  }
  return SIGNED_TOKEN.exec(value)?.[1] ?? null;
}
