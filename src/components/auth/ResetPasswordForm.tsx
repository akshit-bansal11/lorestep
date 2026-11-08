"use client";

import Link from "next/link";
import AuthField from "@/components/auth/AuthField";
import AuthMessage from "@/components/auth/AuthMessage";
import { AUTH_PRIMARY_CLASS } from "@/constants/auth/classes";
import { AUTH_COPY } from "@/constants/auth/copy";
import { PASSWORD_MIN_LENGTH } from "@/constants/auth/password";
import { TEXT_LINK_CLASS } from "@/constants/canon/ui";
import { useAuthForm } from "@/hooks/auth/use-auth-form";
import { callAuth } from "@/lib/auth/auth-call";
import { authClient } from "@/lib/auth/auth-client";
import { fieldValue, validateNewPassword } from "@/utils/auth/validate-auth";

const copy = AUTH_COPY.resetNew;

interface ResetPasswordFormProps {
  token: string;
}

/** Spends the emailed token on a new password. The server also revokes every other session. */
export default function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const form = useAuthForm({
    context: "reset",
    validate: validateNewPassword,
    request: (data) =>
      callAuth((options) =>
        authClient.resetPassword({ newPassword: fieldValue(data, "password"), token }, options),
      ),
    onDone: () => undefined,
  });

  if (form.done) {
    return (
      <div className="flex flex-col gap-4" role="status">
        <AuthMessage>{copy.done}</AuthMessage>
        <Link className={TEXT_LINK_CLASS} href="/sign-in">
          {copy.doneLink}
        </Link>
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-4" noValidate onSubmit={form.onSubmit}>
      <AuthField
        autoComplete="new-password"
        disabled={form.pending}
        error={form.errors.password}
        hint={AUTH_COPY.fields.passwordHint.replace("{min}", String(PASSWORD_MIN_LENGTH))}
        label={AUTH_COPY.fields.newPassword}
        name="password"
        type="password"
      />
      <div role="alert">
        {form.formError !== null && <AuthMessage>{form.formError}</AuthMessage>}
      </div>
      <button className={AUTH_PRIMARY_CLASS} disabled={form.pending} type="submit">
        {form.pending ? copy.pending : copy.submit}
      </button>
    </form>
  );
}
