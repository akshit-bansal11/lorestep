import { AUTH_COPY } from "@/constants/auth/copy";
import type { AuthContext, AuthFailure } from "@/types/auth/auth-form";

const { errors } = AUTH_COPY;

/** Seconds from an `X-Retry-After` or `Retry-After` header, or null when absent or not positive. */
export function parseRetryAfter(value: string | null): number | null {
  if (value === null) return null;
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : null;
}

export function formatWait(seconds: number): string {
  if (seconds < 60) return seconds === 1 ? "1 second" : `${seconds} seconds`;
  const minutes = Math.ceil(seconds / 60);
  return minutes === 1 ? "1 minute" : `${minutes} minutes`;
}

/**
 * The one sentence a failed call shows. Wrong password and unknown email read identically, and a
 * taken email on sign-up does not confirm the address exists (SEC-10).
 */
export function failureMessage(failure: AuthFailure, context: AuthContext): string {
  const { status } = failure;
  const code = failure.code.toUpperCase();

  if (status === 0) return errors.network;
  if (status === 429) {
    return failure.retryAfterSec === null
      ? errors.rateLimitedNoWait
      : errors.rateLimited.replace("{wait}", formatWait(failure.retryAfterSec));
  }
  if (code.includes("COMPROMISED")) return errors.compromised;
  if (code === "RESET_UNAVAILABLE" || (status === 503 && context === "reset-request")) {
    return errors.resetUnavailable;
  }
  if (code === "INVALID_TOKEN") return errors.badToken;
  if (context === "sign-in" && (status === 401 || status === 400)) return errors.credentials;
  if (context === "sign-up" && (status === 422 || code.includes("EXISTS"))) {
    return errors.signUpFailed;
  }
  if (status === 403) return errors.forbidden;
  if (status >= 500) return errors.server;
  return errors.fallback;
}
