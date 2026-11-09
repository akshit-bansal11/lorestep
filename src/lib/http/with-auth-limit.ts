import { createHash } from "node:crypto";

import {
  AUTH_EMAIL_LIMITED_PATHS,
  AUTH_NON_CREDENTIAL_PATHS,
  AUTH_PROXY_PATHS,
  AUTH_SEGMENT_FORBIDDEN,
} from "@/constants/auth/auth";
import { RATE_LIMITS } from "@/constants/http/rate-limits";
import { clientIp } from "@/lib/http/client-ip";
import { enforceRateLimit } from "@/lib/http/enforce-rate-limit";
import { HttpError } from "@/lib/http/http-error";
import { fail } from "@/lib/http/respond";
import type { AuthRouteHandler } from "@/types/auth/auth";

const badPath = () => new HttpError(400, "invalid_path", "That auth path is not valid.");

function decodedSegment(segment: string): string {
  let decoded: string;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    throw badPath();
  }
  if (decoded === "" || decoded === "." || decoded === "..") throw badPath();
  if (AUTH_SEGMENT_FORBIDDEN.test(decoded)) throw badPath();
  return decoded.toLowerCase();
}

/**
 * The limiter key for the exact `path` segments the handler forwards upstream: each segment
 * percent-decoded and lowercased, joined by `/`. Throws 400 `invalid_path` for an empty segment,
 * `.` or `..`, a segment that does not decode, or one that decodes to `/`, `\` or `%` (fail closed:
 * no spelling can alias another path).
 */
export function canonicalAuthPath(path: readonly string[]): string {
  if (path.length === 0) throw badPath();
  return path.map(decodedSegment).join("/");
}

const badBody = () =>
  new HttpError(400, "invalid_body", "Send a JSON object with a non-empty `email`.");

/**
 * The exact body of an email-limited POST and the limiter key of its `email`: sha256 hex of it
 * trimmed and lowercased, so `rate_limits.bucket` never holds a raw address. Fails closed: 415
 * unless `content-type` is `application/json`, 400 unless the body parses to an object with a
 * non-blank string `email`, so no spelling of the request skips the email buckets.
 */
export async function readEmailBody(request: Request): Promise<{ hash: string; body: string }> {
  const mediaType = (request.headers.get("content-type") ?? "").split(";")[0]?.trim();
  if (mediaType?.toLowerCase() !== "application/json") {
    throw new HttpError(415, "unsupported_media_type", "Send the body as application/json.");
  }
  const body = await request.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw badBody();
  }
  if (typeof parsed !== "object" || parsed === null || !("email" in parsed)) throw badBody();
  const { email } = parsed;
  if (typeof email !== "string" || email.trim() === "") throw badBody();
  return { hash: createHash("sha256").update(email.trim().toLowerCase()).digest("hex"), body };
}

/**
 * Fronts the Neon Auth proxy for every method (PLAN.md section 12, N-5, SEC-20). The forwarded
 * path must be in `AUTH_PROXY_PATHS[method]` exactly as forwarded (the SDK joins the raw
 * segments), else 404 `not_found` and nothing reaches Neon; 400 for a malformed path. POSTs then
 * count in `auth:<ip>`, and every POST not in `AUTH_NON_CREDENTIAL_PATHS` also in the strict
 * `auth:<path>:<ip>` bucket. `AUTH_EMAIL_LIMITED_PATHS` must carry a JSON `email` (`readEmailBody`)
 * and also count per email and IP (`auth:email:<path>:<sha256>:<ip>`, the strict one, so nobody
 * can lock a victim out from elsewhere) and per email across all IPs (`auth:email:<path>:<sha256>`,
 * the brute-force ceiling: 40/h for sign-in, 5/h for reset, which sends mail). The path is in
 * both keys, so a sign-in lockout never blocks a reset.
 * The validated body is what is forwarded. 429 past any cap, 403 when the IP cannot be resolved.
 */
export function withAuthLimit(handler: AuthRouteHandler): AuthRouteHandler {
  return async (request, context) => {
    let forwarded = request;
    try {
      const segments = (await context.params).path;
      const path = canonicalAuthPath(segments);
      const allowed = AUTH_PROXY_PATHS[request.method] ?? [];
      if (!allowed.includes(path) || segments.join("/") !== path) {
        throw new HttpError(404, "not_found", "Not found.");
      }
      if (request.method === "POST") {
        const ip = clientIp(request.headers);
        if (ip === null) {
          throw new HttpError(403, "ip_unresolved", "This request could not be attributed.");
        }
        await enforceRateLimit(`auth:${ip}`, RATE_LIMITS.auth);
        if (!AUTH_NON_CREDENTIAL_PATHS.includes(path)) {
          await enforceRateLimit(`auth:${path}:${ip}`, RATE_LIMITS.authCredential);
        }
        if (AUTH_EMAIL_LIMITED_PATHS.includes(path)) {
          const { hash, body } = await readEmailBody(request);
          await enforceRateLimit(`auth:email:${path}:${hash}:${ip}`, RATE_LIMITS.authEmailIp);
          const reset = path === "request-password-reset";
          const ceiling = reset ? RATE_LIMITS.authEmailReset : RATE_LIMITS.authEmailSignIn;
          await enforceRateLimit(`auth:email:${path}:${hash}`, ceiling);
          forwarded = new Request(request, { body });
        }
      }
    } catch (error) {
      return fail(error);
    }
    return handler(forwarded, context);
  };
}
