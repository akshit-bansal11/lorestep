import { describe, expect, it } from "vitest";
import { AUTH_COPY } from "@/constants/auth/copy";
import type { AuthContext, AuthFailure } from "@/types/auth/auth-form";
import { failureMessage, formatWait, parseRetryAfter } from "@/utils/auth/auth-failure";

function failure(status: number, code = "", retryAfterSec: number | null = null): AuthFailure {
  return { status, code, retryAfterSec };
}

describe("parseRetryAfter", () => {
  it("rounds up and rejects junk, zero and negatives", () => {
    expect(parseRetryAfter("12")).toBe(12);
    expect(parseRetryAfter("1.2")).toBe(2);
    expect(parseRetryAfter(null)).toBeNull();
    expect(parseRetryAfter("soon")).toBeNull();
    expect(parseRetryAfter("0")).toBeNull();
    expect(parseRetryAfter("-5")).toBeNull();
  });
});

describe("formatWait", () => {
  it("speaks seconds under a minute and rounds minutes up", () => {
    expect(formatWait(1)).toBe("1 second");
    expect(formatWait(45)).toBe("45 seconds");
    expect(formatWait(60)).toBe("1 minute");
    expect(formatWait(61)).toBe("2 minutes");
  });
});

describe("failureMessage", () => {
  it("names the wait on a 429 and degrades without a header", () => {
    expect(failureMessage(failure(429, "", 90), "sign-in")).toContain("2 minutes");
    expect(failureMessage(failure(429), "sign-in")).toContain("Wait a little");
  });

  it("gives every credential failure the same sentence", () => {
    const wrongPassword = failureMessage(failure(401, "INVALID_EMAIL_OR_PASSWORD"), "sign-in");
    expect(failureMessage(failure(401, "INVALID_PASSWORD"), "sign-in")).toBe(wrongPassword);
    expect(failureMessage(failure(400, "INVALID_EMAIL"), "sign-in")).toBe(wrongPassword);
  });

  it("does not confirm a taken email on sign-up", () => {
    const message = failureMessage(failure(422, "USER_ALREADY_EXISTS"), "sign-up");
    expect(message).not.toMatch(/already (registered|exists|taken)/i);
  });

  it("maps breach, reset and server failures", () => {
    expect(failureMessage(failure(400, "PASSWORD_COMPROMISED"), "reset")).toContain("breach");
    expect(failureMessage(failure(503, "reset_unavailable"), "reset-request")).toContain(
      "not available",
    );
    expect(failureMessage(failure(400, "INVALID_TOKEN"), "reset")).toContain("invalid or has");
    expect(failureMessage(failure(500), "sign-up")).toContain("our side");
    expect(failureMessage(failure(0), "sign-in")).toContain("connection");
  });

  it("reads a 400 on the device page as a dead code, not a credential error", () => {
    expect(failureMessage(failure(400, "INVALID_REQUEST"), "device")).toBe(
      AUTH_COPY.errors.deviceCode,
    );
  });

  it("never returns an empty message", () => {
    const contexts: AuthContext[] = [
      "sign-in",
      "sign-up",
      "reset-request",
      "reset",
      "social",
      "device",
    ];
    for (const context of contexts) {
      expect(failureMessage(failure(418, "TEAPOT"), context)).not.toBe("");
    }
  });
});
