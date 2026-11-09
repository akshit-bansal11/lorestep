import type { AuthFailure } from "@/types/auth/auth-form";
import { parseRetryAfter } from "@/utils/auth/auth-failure";

interface CallOptions {
  onError: (context: { response: Response }) => void;
}

interface AuthResponse {
  error: { status: number; code?: string | undefined } | null;
}

/**
 * Runs one Better-Auth client call and reports how it failed, or null on success. The response
 * headers are only reachable from `onError`, which is where the limiter's wait is read. A call
 * that throws (offline, aborted) comes back as status 0.
 */
export async function callAuth(
  request: (options: CallOptions) => Promise<AuthResponse>,
): Promise<AuthFailure | null> {
  let retryHeader: string | null = null;
  try {
    const { error } = await request({
      onError: ({ response }) => {
        retryHeader = response.headers.get("x-retry-after") ?? response.headers.get("retry-after");
      },
    });
    if (error === null) return null;
    return {
      status: error.status,
      code: error.code ?? "",
      retryAfterSec: parseRetryAfter(retryHeader),
    };
  } catch (error) {
    console.warn("Auth request did not complete", error);
    return { status: 0, code: "", retryAfterSec: null };
  }
}
