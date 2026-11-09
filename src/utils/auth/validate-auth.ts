import { AUTH_COPY, EMAIL_MAX_LENGTH, EMAIL_PATTERN, NAME_MAX_LENGTH } from "@/constants/auth/copy";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/constants/auth/password";
import type { FieldErrors } from "@/types/auth/auth-form";

const { errors } = AUTH_COPY;

/** A form field as a string; a missing field or a file reads as empty. */
export function fieldValue(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === "string" ? value : "";
}

function emailError(email: string): string | undefined {
  if (email.trim() === "") return errors.emailRequired;
  if (email.length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(email.trim())) {
    return errors.emailInvalid;
  }
  return undefined;
}

/** The server's own length rules (`src/constants/auth/password.ts`), so the two cannot disagree. */
function newPasswordError(password: string): string | undefined {
  if (password === "") return errors.passwordRequired;
  if (password.length < PASSWORD_MIN_LENGTH) {
    return errors.passwordShort.replace("{min}", String(PASSWORD_MIN_LENGTH));
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return errors.passwordLong.replace("{max}", String(PASSWORD_MAX_LENGTH));
  }
  return undefined;
}

function nameError(name: string): string | undefined {
  if (name.trim() === "") return errors.nameRequired;
  if (name.trim().length > NAME_MAX_LENGTH) {
    return errors.nameTooLong.replace("{max}", String(NAME_MAX_LENGTH));
  }
  return undefined;
}

/** Drops keys whose message is undefined, so `Object.keys` lists only the invalid fields. */
function present(candidates: Record<string, string | undefined>): FieldErrors {
  const result: FieldErrors = {};
  for (const [key, message] of Object.entries(candidates)) {
    if (message !== undefined) result[key] = message;
  }
  return result;
}

/** Sign-in checks presence only: the password policy is never revealed to a stranger. */
export function validateSignIn(data: FormData): FieldErrors {
  return present({
    email: emailError(fieldValue(data, "email")),
    password: fieldValue(data, "password") === "" ? errors.passwordRequired : undefined,
  });
}

export function validateSignUp(data: FormData): FieldErrors {
  return present({
    name: nameError(fieldValue(data, "name")),
    email: emailError(fieldValue(data, "email")),
    password: newPasswordError(fieldValue(data, "password")),
  });
}

export function validateResetRequest(data: FormData): FieldErrors {
  return present({ email: emailError(fieldValue(data, "email")) });
}

export function validateNewPassword(data: FormData): FieldErrors {
  return present({ password: newPasswordError(fieldValue(data, "password")) });
}
