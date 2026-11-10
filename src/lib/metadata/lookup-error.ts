/** A failed provider lookup. `status` is the HTTP status; undefined for a network error. */
export class LookupError extends Error {
  readonly status: number | undefined;

  constructor(status: number | undefined) {
    super(status === undefined ? "Provider request failed" : `Provider answered ${status}`);
    this.name = "LookupError";
    this.status = status;
  }

  /** A 4xx other than 429 fails the same way next time, so the entry is not retried. */
  get permanent(): boolean {
    const status = this.status ?? 0;
    return status >= 400 && status < 500 && status !== 429;
  }
}
