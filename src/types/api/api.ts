/** How a call to Lorestep's own API failed. `status` 0 means it never got an answer (offline). */
export interface ApiFailure {
  status: number;
  code: string;
  /** The server's own sentence, empty when none arrived. */
  message: string;
  retryAfterSec: number | null;
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; failure: ApiFailure };
