import { describe, expect, it } from "vitest";

import { callAuth } from "@/lib/auth/auth-call";

describe("callAuth", () => {
  it("returns null on success", async () => {
    expect(await callAuth(async () => ({ error: null }))).toBeNull();
  });

  it("reports status and code of a failed call", async () => {
    const failure = await callAuth(async () => ({ error: { status: 401, code: "INVALID" } }));
    expect(failure).toEqual({ status: 401, code: "INVALID", retryAfterSec: null });
  });

  it("reads the wait from the response headers given to onError", async () => {
    const failure = await callAuth(async (options) => {
      options.onError({ response: new Response(null, { headers: { "x-retry-after": "30" } }) });
      return { error: { status: 429 } };
    });
    expect(failure).toEqual({ status: 429, code: "", retryAfterSec: 30 });
  });

  it("maps a thrown request to status 0", async () => {
    const failure = await callAuth(async () => {
      throw new Error("offline");
    });
    expect(failure).toEqual({ status: 0, code: "", retryAfterSec: null });
  });
});
