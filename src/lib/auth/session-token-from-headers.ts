import { getSessionCookie } from "better-auth/cookies";

import { BEARER_SCHEME } from "@/constants/http/http";

/**
 * The raw session token a request carries, bearer header first, then the session cookie; null
 * when it carries none. UNVERIFIED: the signature is stripped, not checked. Use it only to refuse
 * a request, never to authenticate one (a forged value can at most get its own request refused).
 */
export function sessionTokenFrom(headers: Headers | undefined): string | null {
  if (headers === undefined) return null;
  const authorization = headers.get("authorization") ?? "";
  const signed = BEARER_SCHEME.test(authorization)
    ? authorization.replace(BEARER_SCHEME, "").trim()
    : getSessionCookie(headers);
  if (!signed) return null;

  let value: string;
  try {
    value = decodeURIComponent(signed);
  } catch {
    return null;
  }
  const dot = value.lastIndexOf(".");
  return dot > 0 ? value.slice(0, dot) : null;
}
