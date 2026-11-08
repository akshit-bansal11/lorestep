/**
 * Every app limiter in one place (BACKEND-SPEC BE-D02). Fixed windows (PLAN.md D-11). Better-Auth's
 * own endpoint limits are `AUTH_RATE_RULES` in `constants/auth/auth.ts`.
 */
export const RATE_LIMITS = {
  /** Per client IP. */
  authProviders: { limit: 30, windowSec: 60 },
  /** Per user: each call fans out to paid or quota-limited third-party APIs. */
  metadata: { limit: 60, windowSec: 60 },
  search: { limit: 60, windowSec: 60 },
  resolveLink: { limit: 30, windowSec: 60 },
};
