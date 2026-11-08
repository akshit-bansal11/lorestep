import { LIBRARY_COPY } from "@/constants/log/copy";
import type { ApiFailure } from "@/types/api/api";
import { formatWait } from "@/utils/auth/auth-failure";

const { failure: copy } = LIBRARY_COPY;

/** One sentence naming why a call failed and what to do (UX-03, UX-D05, UX-D06). */
export function failureMessage(failure: ApiFailure): string {
  if (failure.status === 0) return copy.offline;
  if (failure.status === 401) return copy.unauthorized;
  if (failure.status === 429) {
    return failure.retryAfterSec === null
      ? copy.rateLimitedNoWait
      : copy.rateLimited.replace("{wait}", formatWait(failure.retryAfterSec));
  }
  return failure.message !== ""
    ? failure.message
    : copy.generic.replace("{status}", String(failure.status));
}
