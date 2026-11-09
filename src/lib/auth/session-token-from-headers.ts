import { BEARER_SCHEME } from "@/constants/http/http";

/** Every cookie name Better-Auth may read a session from ends with this, prefixed or not. */
const SESSION_COOKIE_SUFFIX = "session_token";

/**
 * Every raw session token a request carries: the bearer header AND every session-token cookie
 * (any prefix, any count). Collecting all of them, not the first one found, is the point: a
 * caller must not be able to pass a harmless credential to this check while Better-Auth resolves
 * a different one (parser differential). UNVERIFIED: signatures are stripped, not checked. Use it
 * only to refuse a request, never to authenticate one (a forged value can only get its own
 * request refused).
 */
export function sessionTokensFrom(headers: Headers | undefined): string[] {
  if (headers === undefined) return [];
  const signed: string[] = [];

  const authorization = headers.get("authorization") ?? "";
  if (BEARER_SCHEME.test(authorization)) signed.push(authorization.replace(BEARER_SCHEME, ""));

  for (const pair of (headers.get("cookie") ?? "").split(";")) {
    const eq = pair.indexOf("=");
    if (eq > 0 && pair.slice(0, eq).trim().endsWith(SESSION_COOKIE_SUFFIX)) {
      signed.push(pair.slice(eq + 1));
    }
  }

  const tokens: string[] = [];
  for (const raw of signed) {
    const token = unsignedToken(raw.trim());
    if (token !== null && !tokens.includes(token)) tokens.push(token);
  }
  return tokens;
}

/** `token.signature` → `token`; null when the value is malformed. */
function unsignedToken(signed: string): string | null {
  let value: string;
  try {
    value = decodeURIComponent(signed);
  } catch {
    return null;
  }
  const dot = value.lastIndexOf(".");
  return dot > 0 ? value.slice(0, dot) : null;
}
