import { describe, expect, it } from "vitest";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/constants/auth/password";
import {
  fieldValue,
  validateNewPassword,
  validateResetRequest,
  validateSignIn,
  validateSignUp,
} from "@/utils/auth/validate-auth";

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

const LONG_ENOUGH = "a".repeat(PASSWORD_MIN_LENGTH);

describe("fieldValue", () => {
  it("reads a missing field and a file as empty", () => {
    const data = form({});
    data.set("upload", new File(["x"], "x.txt"));
    expect(fieldValue(data, "nope")).toBe("");
    expect(fieldValue(data, "upload")).toBe("");
  });
});

describe("validateSignIn", () => {
  it("accepts any non-empty password, however short", () => {
    expect(validateSignIn(form({ email: "a@b.co", password: "x" }))).toEqual({});
  });

  it("flags an empty form on both fields", () => {
    expect(Object.keys(validateSignIn(form({})))).toEqual(["email", "password"]);
  });

  it("rejects a malformed email", () => {
    expect(Object.keys(validateSignIn(form({ email: "not-an-email", password: "x" })))).toEqual([
      "email",
    ]);
  });
});

describe("validateSignUp", () => {
  const valid = { name: "Ada", email: "ada@example.com", password: LONG_ENOUGH };

  it("accepts a complete form", () => {
    expect(validateSignUp(form(valid))).toEqual({});
  });

  it("enforces the server's password length bounds exactly", () => {
    const short = validateSignUp(form({ ...valid, password: "a".repeat(PASSWORD_MIN_LENGTH - 1) }));
    const long = validateSignUp(form({ ...valid, password: "a".repeat(PASSWORD_MAX_LENGTH + 1) }));
    const top = validateSignUp(form({ ...valid, password: "a".repeat(PASSWORD_MAX_LENGTH) }));
    expect(Object.keys(short)).toEqual(["password"]);
    expect(Object.keys(long)).toEqual(["password"]);
    expect(top).toEqual({});
  });

  it("requires a name that is not only whitespace", () => {
    expect(Object.keys(validateSignUp(form({ ...valid, name: "   " })))).toEqual(["name"]);
  });
});

describe("validateResetRequest and validateNewPassword", () => {
  it("checks the email alone", () => {
    expect(validateResetRequest(form({ email: "a@b.co" }))).toEqual({});
    expect(Object.keys(validateResetRequest(form({ email: "" })))).toEqual(["email"]);
  });

  it("applies the new-password policy", () => {
    expect(validateNewPassword(form({ password: LONG_ENOUGH }))).toEqual({});
    expect(Object.keys(validateNewPassword(form({ password: "short" })))).toEqual(["password"]);
  });
});
