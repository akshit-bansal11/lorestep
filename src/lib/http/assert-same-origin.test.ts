import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { assertSameOrigin } from "@/lib/http/assert-same-origin";
import { HttpError } from "@/lib/http/http-error";

const ORIGIN = "https://lorestep.test";
const TOKEN = "a".repeat(43);
const BAD_ORIGIN = "403 bad_origin";
const BAD_TYPE = "415 unsupported_media_type";
const BAD_TOKEN = "403 csrf_failed";

function request(headers: Record<string, string>) {
  return new NextRequest(`${ORIGIN}/api/v1/entries`, { method: "POST", headers });
}

const valid = {
  origin: ORIGIN,
  "content-type": "application/json; charset=utf-8",
  cookie: `__Host-csrf=${TOKEN}`,
  "x-csrf-token": TOKEN,
};

function codeOf(headers: Record<string, string>) {
  try {
    assertSameOrigin(request(headers));
    return "ok";
  } catch (error) {
    return error instanceof HttpError ? `${error.status} ${error.code}` : "other";
  }
}

describe("assertSameOrigin", () => {
  beforeEach(() => {
    vi.stubEnv("BETTER_AUTH_URL", `${ORIGIN}/`);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("passes a same-origin JSON request carrying the matching token", () => {
    expect(codeOf(valid)).toBe("ok");
  });

  it.each([
    ["no Origin", { ...valid, origin: "" }, BAD_ORIGIN],
    ["a foreign Origin", { ...valid, origin: "https://evil.test" }, BAD_ORIGIN],
    ["a prefix-sharing Origin", { ...valid, origin: `${ORIGIN}.evil.test` }, BAD_ORIGIN],
    ["a form body", { ...valid, "content-type": "application/x-www-form-urlencoded" }, BAD_TYPE],
    ["text/plain", { ...valid, "content-type": "text/plain" }, BAD_TYPE],
    ["no content type", { ...valid, "content-type": "" }, BAD_TYPE],
    ["no CSRF cookie", { ...valid, cookie: "" }, BAD_TOKEN],
    ["no CSRF header", { ...valid, "x-csrf-token": "" }, BAD_TOKEN],
    ["a mismatched token", { ...valid, "x-csrf-token": "b".repeat(43) }, BAD_TOKEN],
    ["a token of another length", { ...valid, "x-csrf-token": TOKEN.slice(1) }, BAD_TOKEN],
  ])("rejects %s", (_label, headers, expected) => {
    expect(codeOf(headers)).toBe(expected);
  });
});
