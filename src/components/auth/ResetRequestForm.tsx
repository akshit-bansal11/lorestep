"use client";

import AuthField from "@/components/auth/AuthField";
import AuthMessage from "@/components/auth/AuthMessage";
import { AUTH_PRIMARY_CLASS } from "@/constants/auth/classes";
import { AUTH_COPY } from "@/constants/auth/copy";
import { useAuthForm } from "@/hooks/auth/use-auth-form";
import { useAuthProviders } from "@/hooks/auth/use-auth-providers";
import { callAuth } from "@/lib/auth/auth-call";
import { authClient } from "@/lib/auth/auth-client";
import { fieldValue, validateResetRequest } from "@/utils/auth/validate-auth";

const copy = AUTH_COPY.resetRequest;

interface ResetRequestFormProps {
  /** Set when the visitor arrived from a dead link, so the reason sits above the form. */
  notice?: string;
}

/** Asks for an email. The answer is the same whether or not an account exists (SEC-10). */
export default function ResetRequestForm({ notice }: ResetRequestFormProps) {
  const { providers } = useAuthProviders();
  const form = useAuthForm({
    context: "reset-request",
    validate: validateResetRequest,
    request: (data) =>
      callAuth((options) =>
        authClient.requestPasswordReset(
          { email: fieldValue(data, "email").trim(), redirectTo: "/reset-password" },
          options,
        ),
      ),
    onDone: () => undefined,
  });
  const locked = form.pending || form.done;

  if (providers?.reset === false) {
    return (
      <div role="status">
        <AuthMessage>{copy.unavailable}</AuthMessage>
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-4" noValidate onSubmit={form.onSubmit}>
      {notice !== undefined && (
        <div role="status">
          <AuthMessage>{notice}</AuthMessage>
        </div>
      )}
      <AuthField
        autoComplete="email"
        disabled={locked}
        error={form.errors.email}
        label={AUTH_COPY.fields.email}
        name="email"
        type="email"
      />
      <div role="alert">
        {form.formError !== null && <AuthMessage>{form.formError}</AuthMessage>}
      </div>
      <button className={AUTH_PRIMARY_CLASS} disabled={locked} type="submit">
        {form.pending ? copy.pending : copy.submit}
      </button>
      <div role="status">{form.done && <AuthMessage>{copy.done}</AuthMessage>}</div>
    </form>
  );
}
