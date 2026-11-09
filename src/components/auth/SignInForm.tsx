"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthField from "@/components/auth/AuthField";
import AuthMessage from "@/components/auth/AuthMessage";
import OAuthButtons from "@/components/auth/OAuthButtons";
import { AUTH_PRIMARY_CLASS } from "@/constants/auth/classes";
import { AUTH_COPY } from "@/constants/auth/copy";
import { QUIET_LINK_CLASS } from "@/constants/canon/ui";
import { useAuthForm } from "@/hooks/auth/use-auth-form";
import { useAuthProviders } from "@/hooks/auth/use-auth-providers";
import { callAuth } from "@/lib/auth/auth-call";
import { authClient } from "@/lib/auth/auth-client";
import { nextPathFromLocation } from "@/utils/auth/safe-next-path";
import { fieldValue, validateSignIn } from "@/utils/auth/validate-auth";
import { cn } from "@/utils/cn";

const copy = AUTH_COPY.signIn;

interface SignInFormProps {
  /**
   * On `/oauth/login`: the sign-in POST carries the page's `oauth_query` (the Neon client
   * attaches it) and Neon's answer navigates on to the consent page, so the form never follows
   * `?next=`; a refresh is the fallback that shows the signed-in Continue step.
   */
  oauth?: boolean;
}

export default function SignInForm({ oauth = false }: SignInFormProps) {
  const router = useRouter();
  const { providers } = useAuthProviders();
  const form = useAuthForm({
    context: "sign-in",
    validate: validateSignIn,
    request: (data) =>
      callAuth((options) =>
        authClient.signIn.email(
          { email: fieldValue(data, "email").trim(), password: fieldValue(data, "password") },
          options,
        ),
      ),
    onDone: () => (oauth ? router.refresh() : router.replace(nextPathFromLocation())),
  });
  const locked = form.pending || form.done;

  return (
    <>
      <OAuthButtons busy={locked} providers={providers} returnHere={oauth} />
      <form className="flex flex-col gap-4" noValidate onSubmit={form.onSubmit}>
        <AuthField
          autoComplete="email"
          disabled={locked}
          error={form.errors.email}
          label={AUTH_COPY.fields.email}
          name="email"
          type="email"
        />
        <AuthField
          autoComplete="current-password"
          disabled={locked}
          error={form.errors.password}
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
        {providers?.reset !== false && (
          <Link className={cn(QUIET_LINK_CLASS, "text-[13px]")} href="/reset-password">
            {copy.forgot}
          </Link>
        )}
      </form>
    </>
  );
}
