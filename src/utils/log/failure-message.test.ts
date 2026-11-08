import { describe, expect, it } from "vitest";
import { failureMessage } from "@/utils/log/failure-message";

const failure = { status: 500, code: "", message: "", retryAfterSec: null };

describe("failureMessage", () => {
  it("says offline for status 0", () => {
    expect(failureMessage({ ...failure, status: 0 })).toMatch(/offline/i);
  });

  it("says the session ended for 401", () => {
    expect(failureMessage({ ...failure, status: 401 })).toMatch(/sign in/i);
  });

  it("names the wait for 429, with or without Retry-After", () => {
    expect(failureMessage({ ...failure, status: 429, retryAfterSec: 30 })).toContain("30 seconds");
    expect(failureMessage({ ...failure, status: 429 })).toContain("a minute");
  });

  it("prefers the server's own sentence, then names the status", () => {
    expect(failureMessage({ ...failure, status: 409, message: "Already in your library." })).toBe(
      "Already in your library.",
    );
    expect(failureMessage(failure)).toContain("500");
  });
});
