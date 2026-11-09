"use client";

import { useState } from "react";
import AuthMessage from "@/components/auth/AuthMessage";
import { AUTH_PRIMARY_CLASS } from "@/constants/auth/classes";
import { AUTH_COPY } from "@/constants/auth/copy";
import { OAUTH_COPY } from "@/constants/auth/oauth";
import { callAuth } from "@/lib/auth/auth-call";
import { authClient } from "@/lib/auth/auth-client";
import { continueBody, readOAuthQuery } from "@/lib/auth/continue-oauth";
import { failureMessage } from "@/utils/auth/auth-failure";

interface OAuthContinueProps {
  email: string;
}

const copy = OAUTH_COPY.login;

/**
 * `/oauth/login` with a session already (signed in before, or back from a social provider):
 * one click resumes the authorization request through `POST /oauth2/continue`. A button, not an
 * effect, so the user sees which account the app is about to get. Neon's answer carries the next
 * URL (the consent page, or the app when consent is stored) and the client navigates to it.
 */
export default function OAuthContinue({ email }: OAuthContinueProps) {
  const [phase, setPhase] = useState<"idle" | "pending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function resume() {
    const oauthQuery = readOAuthQuery(window.location.search);
    if (oauthQuery === null) {
      setError(AUTH_COPY.errors.oauthExpired);
      return;
    }
    setPhase("pending");
    setError(null);
    const failure = await callAuth((options) =>
      authClient.oauth2.continue(continueBody(oauthQuery), options),
    );
    if (failure === null) {
      setPhase("done");
      return;
    }
    setPhase("idle");
    setError(failureMessage(failure, "oauth"));
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] text-muted">
        {copy.signedInAs} <span className="text-ink">{email}</span>
      </p>
      <div role="alert">{error !== null && <AuthMessage>{error}</AuthMessage>}</div>
      <button
        className={AUTH_PRIMARY_CLASS}
        disabled={phase !== "idle"}
        onClick={resume}
        type="button"
      >
        {phase === "pending" ? copy.pending : copy.submit}
      </button>
      <div role="status">{phase === "done" && <AuthMessage>{copy.done}</AuthMessage>}</div>
    </div>
  );
}
