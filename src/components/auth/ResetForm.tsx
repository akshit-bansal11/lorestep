"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import ResetRequestForm from "@/components/auth/ResetRequestForm";
import { AUTH_COPY } from "@/constants/auth/copy";
import { TEXT_LINK_CLASS } from "@/constants/canon/ui";

/**
 * The reset page's two states, chosen by the link the visitor arrived on: `?token=` (a valid
 * emailed link) shows the new-password form; anything else, including `?error=` from a dead
 * link, shows the request form.
 */
export default function ResetForm() {
  const params = useSearchParams();
  const token = params.get("token");
  const dead = params.get("error") !== null;

  if (token !== null && token !== "") {
    return (
      <AuthShell lead={AUTH_COPY.resetNew.lead} title={AUTH_COPY.resetNew.title}>
        <ResetPasswordForm token={token} />
      </AuthShell>
    );
  }

  const copy = AUTH_COPY.resetRequest;
  return (
    <AuthShell
      footer={
        <>
          {copy.backPrompt}{" "}
          <Link className={TEXT_LINK_CLASS} href="/sign-in">
            {copy.backLink}
          </Link>
        </>
      }
      lead={copy.lead}
      title={copy.title}
    >
      <ResetRequestForm notice={dead ? AUTH_COPY.resetNew.badLink : undefined} />
    </AuthShell>
  );
}
