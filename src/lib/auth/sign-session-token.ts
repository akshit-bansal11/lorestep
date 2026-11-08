import { createHmac } from "node:crypto";

/**
 * A raw Better-Auth session token in the signed form its session cookie carries:
 * `token.base64(HMAC-SHA256(secret, token))`, 44 characters of padded standard base64 after the dot.
 * That is the only form `bearer({ requireSignature: true })` accepts and the form better-call's
 * `getSignedCookie` verifies (it rejects any signature that is not 44 characters ending in `=`).
 */
export function signSessionToken(token: string, secret: string): string {
  return `${token}.${createHmac("sha256", secret).update(token).digest("base64")}`;
}
