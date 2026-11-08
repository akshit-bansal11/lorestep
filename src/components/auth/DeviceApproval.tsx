"use client";

import Link from "next/link";
import { useState } from "react";
import AuthMessage from "@/components/auth/AuthMessage";
import { AUTH_PRIMARY_CLASS, AUTH_SECONDARY_CLASS } from "@/constants/auth/classes";
import { AUTH_COPY } from "@/constants/auth/copy";
import { PROSE_CLASS, TEXT_LINK_CLASS } from "@/constants/canon/ui";
import { callAuth } from "@/lib/auth/auth-call";
import { authClient } from "@/lib/auth/auth-client";
import type { DevicePhase } from "@/types/auth/auth-form";
import { failureMessage } from "@/utils/auth/auth-failure";

const copy = AUTH_COPY.device;

interface DeviceApprovalProps {
  /** Already checked on the server: pending, unexpired and claimed by the signed-in user. */
  userCode: string;
}

/**
 * Approve or Deny for one Dogear sign-in request. Shows the code so the user can compare it with
 * the extension, and says what approving grants before either button is pressed.
 */
export default function DeviceApproval({ userCode }: DeviceApprovalProps) {
  const [phase, setPhase] = useState<DevicePhase>("idle");
  const [error, setError] = useState<string | null>(null);

  async function decide(approve: boolean) {
    setPhase(approve ? "approving" : "denying");
    setError(null);
    const failure = await callAuth((options) =>
      approve
        ? authClient.device.approve({ userCode }, options)
        : authClient.device.deny({ userCode }, options),
    );
    if (failure === null) {
      setPhase(approve ? "approved" : "denied");
      return;
    }
    setPhase("idle");
    setError(failureMessage(failure, "device"));
  }

  const answered = phase === "approved" || phase === "denied";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-[12px] text-muted">{copy.codeLabel}</p>
        <p className="font-mono text-[20px] text-ink tracking-[0.2em]">{userCode}</p>
        <p className="text-[12px] text-muted">{copy.codeHint}</p>
      </div>
      <p className={PROSE_CLASS}>{copy.grants}</p>
      <p className={PROSE_CLASS}>{copy.lifetime}</p>
      <div role="alert">{error !== null && <AuthMessage>{error}</AuthMessage>}</div>
      {!answered && (
        <div className="flex flex-col gap-2">
          <button
            className={AUTH_PRIMARY_CLASS}
            disabled={phase !== "idle"}
            onClick={() => decide(true)}
            type="button"
          >
            {phase === "approving" ? copy.approving : copy.approve}
          </button>
          <button
            className={AUTH_SECONDARY_CLASS}
            disabled={phase !== "idle"}
            onClick={() => decide(false)}
            type="button"
          >
            {phase === "denying" ? copy.denying : copy.deny}
          </button>
        </div>
      )}
      <div role="status">
        {phase === "approved" && <AuthMessage>{copy.approved}</AuthMessage>}
        {phase === "denied" && <AuthMessage>{copy.denied}</AuthMessage>}
      </div>
      {phase === "approved" && (
        <Link className={TEXT_LINK_CLASS} href="/account">
          {copy.accountLink}
        </Link>
      )}
    </div>
  );
}
