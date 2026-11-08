/** A failure with a known status and a stable `code` (API-05); `respond.ts` turns it into JSON. */
export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly headers: HeadersInit | undefined;

  constructor(status: number, code: string, message: string, headers?: HeadersInit) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.headers = headers;
  }
}
