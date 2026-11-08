"use client";

import { useState } from "react";
import AuthMessage from "@/components/auth/AuthMessage";
import { AUTH_SECONDARY_CLASS } from "@/constants/auth/classes";
import { AUTH_COPY } from "@/constants/auth/copy";
import { callAuth } from "@/lib/auth/auth-call";
import { authClient } from "@/lib/auth/auth-client";
import type { AuthProviders, SocialProvider } from "@/types/auth/auth-form";
import { failureMessage } from "@/utils/auth/auth-failure";
import { nextPathFromLocation } from "@/utils/auth/safe-next-path";

interface OAuthButtonsProps {
  /** Null while unknown or when the lookup failed; either way no button is shown. */
  providers: AuthProviders | null;
  /** Locks the buttons while the email form is submitting. */
  busy: boolean;
}

const BUTTONS: readonly { provider: SocialProvider; label: string }[] = [
  { provider: "github", label: AUTH_COPY.oauth.github },
  { provider: "google", label: AUTH_COPY.oauth.google },
];

/** One button per provider the server says is configured, then a divider to the email form. */
export default function OAuthButtons({ providers, busy }: OAuthButtonsProps) {
  const [active, setActive] = useState<SocialProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  const offered = BUTTONS.filter((button) => providers?.[button.provider] === true);
  if (offered.length === 0) return null;

  async function start(provider: SocialProvider) {
    setActive(provider);
    setError(null);
    const failure = await callAuth((options) =>
      authClient.signIn.social({ provider, callbackURL: nextPathFromLocation() }, options),
    );
    if (failure !== null) {
      setActive(null);
      setError(failureMessage(failure, "social"));
    }
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        {offered.map(({ provider, label }) => (
          <button
            className={AUTH_SECONDARY_CLASS}
            disabled={busy || active !== null}
            key={provider}
            onClick={() => start(provider)}
            type="button"
          >
            {active === provider ? AUTH_COPY.oauth.pending : label}
          </button>
        ))}
        <div role="alert">{error !== null && <AuthMessage>{error}</AuthMessage>}</div>
      </div>
      <p aria-hidden="true" className="text-center text-[12px] text-faint">
        {AUTH_COPY.oauth.divider}
      </p>
    </>
  );
}
