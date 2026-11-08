import { randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";

import { CSRF_COOKIE, CSRF_TOKEN_BYTES, CSRF_TOKEN_PATTERN } from "@/constants/http/http";
import { ok } from "@/lib/http/respond";

/**
 * Issues the double-submit CSRF token: set as the `__Host-csrf` cookie and returned in the body for
 * the client to echo in `x-csrf-token`. An existing well-formed token is reused so two tabs never
 * invalidate each other. Holds no secret beyond the browser's own cookie, so it needs no limiter.
 */
export function GET(request: NextRequest) {
  const existing = request.cookies.get(CSRF_COOKIE)?.value ?? "";
  const token = CSRF_TOKEN_PATTERN.test(existing)
    ? existing
    : randomBytes(CSRF_TOKEN_BYTES).toString("base64url");

  const response = ok({ token }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(CSRF_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
  });
  return response;
}
