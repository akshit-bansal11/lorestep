import { createNeonAuth, type NeonAuth } from "@neon/auth/next/server";

function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error(`${name} is not set. See .env.example.`);
  }
  return value;
}

/**
 * The Neon Auth server instance (PLAN.md section 12, N-3). Built per call, like `db()`, so a
 * build or `check:static` without auth env never reads it; a missing variable fails at use.
 *
 * Every cookie field is explicit: `sameSite` because the docs disagree on the default (SEC-07),
 * `sessionDataTtl` 60 s bounds how long a revoked session can still read as signed in, and
 * `domain` stays unset so the cookie is host-only.
 */
export function neonAuth(): NeonAuth {
  return createNeonAuth({
    baseUrl: required("NEON_AUTH_BASE_URL"),
    cookies: {
      secret: required("NEON_AUTH_COOKIE_SECRET"),
      sessionDataTtl: 60,
      sameSite: "lax",
    },
  });
}
