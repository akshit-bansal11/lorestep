import { NextResponse } from "next/server";

import { HttpError } from "@/lib/http/http-error";

/** `{ data }` with a status (API-05). */
export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

/**
 * `{ error: { code, message } }`. An HttpError keeps its status and headers; anything else is a
 * bug, logged and answered as a bare 500 so internals never reach the client.
 */
export function fail(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status, headers: error.headers },
    );
  }
  console.error("Unhandled route error", error);
  return NextResponse.json(
    { error: { code: "internal", message: "Something went wrong. Try again." } },
    { status: 500 },
  );
}
