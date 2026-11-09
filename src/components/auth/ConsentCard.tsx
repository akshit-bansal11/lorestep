"use client";

import { useState } from "react";
import AuthMessage from "@/components/auth/AuthMessage";
import { AUTH_PRIMARY_CLASS, AUTH_SECONDARY_CLASS } from "@/constants/auth/classes";
import { AUTH_COPY } from "@/constants/auth/copy";
import { OAUTH_COPY } from "@/constants/auth/oauth";
import { callAuth } from "@/lib/auth/auth-call";
import { authClient } from "@/lib/auth/auth-client";
import { consentBody, readOAuthQuery } from "@/lib/auth/continue-oauth";
import { failureMessage } from "@/utils/auth/auth-failure";

interface ConsentCardProps {
  clientName: string;
  email: string;
  /** Plain-words lines for the requested scopes and resource, built on the server. */
  grants: string[];
  /** Host of the redirect URI the code goes to; null when it did not parse. */
  redirectHost: string | null;
}

const copy = OAUTH_COPY.consent;

/**
 * Allow or Deny for one authorization request. Both send `POST /oauth2/consent` with the page's
 * `oauth_query` exactly as received; Neon answers with the app's redirect URI (a `code`, or
 * `error=access_denied` on Deny) and the client navigates there itself.
 */
export default function ConsentCard({ clientName, email, grants, redirectHost }: ConsentCardProps) {
  const [phase, setPhase] = useState<"idle" | "allow" | "deny" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function respond(accept: boolean) {
    const oauthQuery = readOAuthQuery(window.location.search);
    if (oauthQuery === null) {
      setError(AUTH_COPY.errors.oauthExpired);
      return;
    }
    setPhase(accept ? "allow" : "deny");
    setError(null);
    const failure = await callAuth((options) =>
      authClient.oauth2.consent(consentBody(accept, oauthQuery), options),
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
      <div className="flex flex-col gap-2">
        <p className="text-[13px] text-muted">{copy.wants}</p>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-[13px] text-ink">
          {grants.map((grant) => (
            <li key={grant}>{grant}</li>
          ))}
        </ul>
      </div>
      <p className="text-[13px] text-muted">
        {copy.signedInAs} <span className="text-ink">{email}</span>
      </p>
      {redirectHost !== null && (
        <p className="text-[13px] text-muted">
          {copy.returnsTo} <span className="break-all text-ink">{redirectHost}</span>
        </p>
      )}
      <div role="alert">{error !== null && <AuthMessage>{error}</AuthMessage>}</div>
      <div className="flex gap-2">
        <button
          className={AUTH_SECONDARY_CLASS}
          disabled={phase !== "idle"}
          onClick={() => respond(false)}
          type="button"
        >
          {phase === "deny" ? copy.denying : copy.deny}
        </button>
        <button
          className={AUTH_PRIMARY_CLASS}
          disabled={phase !== "idle"}
          onClick={() => respond(true)}
          type="button"
        >
          {phase === "allow" ? copy.allowing : copy.allow}
        </button>
      </div>
      <div role="status">
        {phase === "done" && <AuthMessage>{copy.done.replace("{name}", clientName)}</AuthMessage>}
      </div>
    </div>
  );
}
