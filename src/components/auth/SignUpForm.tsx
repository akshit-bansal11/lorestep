"use client";

import { useRouter } from "next/navigation";
import AuthField from "@/components/auth/AuthField";
import AuthMessage from "@/components/auth/AuthMessage";
import OAuthButtons from "@/components/auth/OAuthButtons";
import { AUTH_PRIMARY_CLASS } from "@/constants/auth/classes";
import { AUTH_COPY } from "@/constants/auth/copy";
import { PASSWORD_MIN_LENGTH } from "@/constants/auth/password";
import { useAuthForm } from "@/hooks/auth/use-auth-form";
import { useAuthProviders } from "@/hooks/auth/use-auth-providers";
import { callAuth } from "@/lib/auth/auth-call";
import { authClient } from "@/lib/auth/auth-client";
import { fieldValue, validateSignUp } from "@/utils/auth/validate-auth";

const copy = AUTH_COPY.signUp;

export default function SignUpForm() {
  const router = useRouter();
  const { providers } = useAuthProviders();
  const form = useAuthForm({
    context: "sign-up",
    validate: validateSignUp,
    request: (data) =>
      callAuth((options) =>
        authClient.signUp.email(
          {
            name: fieldValue(data, "name").trim(),
            email: fieldValue(data, "email").trim(),
            password: fieldValue(data, "password"),
          },
          options,
        ),
      ),
    onDone: () => router.replace("/"),
  });
  const locked = form.pending || form.done;

  return (
    <>
      <OAuthButtons busy={locked} providers={providers} />
      <form className="flex flex-col gap-4" noValidate onSubmit={form.onSubmit}>
        <AuthField
          autoComplete="name"
          disabled={locked}
          error={form.errors.name}
          label={AUTH_COPY.fields.name}
          name="name"
          type="text"
        />
        <AuthField
          autoComplete="email"
          disabled={locked}
          error={form.errors.email}
          label={AUTH_COPY.fields.email}
          name="email"
          type="email"
        />
        <AuthField
          autoComplete="new-password"
          disabled={locked}
          error={form.errors.password}
          hint={AUTH_COPY.fields.passwordHint.replace("{min}", String(PASSWORD_MIN_LENGTH))}
          label={AUTH_COPY.fields.password}
          name="password"
          type="password"
        />
        <div role="alert">
          {form.formError !== null && <AuthMessage>{form.formError}</AuthMessage>}
        </div>
        <button className={AUTH_PRIMARY_CLASS} disabled={locked} type="submit">
          {form.pending ? copy.pending : copy.submit}
        </button>
        <div role="status">{form.done && <AuthMessage>{copy.done}</AuthMessage>}</div>
      </form>
    </>
  );
}
