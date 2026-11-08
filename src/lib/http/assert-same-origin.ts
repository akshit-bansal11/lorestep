import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

import { CSRF_COOKIE, CSRF_HEADER } from "@/constants/http/http";
import { appOrigin } from "@/lib/auth/auth-env";
import { HttpError } from "@/lib/http/http-error";

function sameToken(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * SEC-19 for Lorestep's own cookie-authenticated mutating routes (PLAN.md section 11 Q3): exact
 * `Origin` match, a JSON body (not a CORS-simple content type), and the double-submit token, the
 * `x-csrf-token` header equal to the `__Host-csrf` cookie in constant time. Bearer callers skip
 * this: they carry no ambient credential. Throws HttpError 403 or 415.
 */
export function assertSameOrigin(request: NextRequest): void {
  if (request.headers.get("origin") !== appOrigin()) {
    throw new HttpError(403, "bad_origin", "This request did not come from Lorestep.");
  }

  const mediaType = (request.headers.get("content-type") ?? "").split(";")[0]?.trim();
  if (mediaType?.toLowerCase() !== "application/json") {
    throw new HttpError(415, "unsupported_media_type", "Send the body as application/json.");
  }

  const cookie = request.cookies.get(CSRF_COOKIE)?.value ?? "";
  const header = request.headers.get(CSRF_HEADER) ?? "";
  if (cookie === "" || !sameToken(cookie, header)) {
    throw new HttpError(403, "csrf_failed", "Reload the page and try again.");
  }
}
