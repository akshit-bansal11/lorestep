export interface RateLimitResult {
  allowed: boolean;
  /** Whole seconds until the current window closes, for `Retry-After`. */
  retryAfterSec: number;
}
