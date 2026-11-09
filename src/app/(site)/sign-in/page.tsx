import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import SignInForm from "@/components/auth/SignInForm";
import { AUTH_COPY } from "@/constants/auth/copy";
import { TEXT_LINK_CLASS } from "@/constants/canon/ui";

export const metadata: Metadata = {
  title: "Sign in — Lorestep",
  robots: { index: false, follow: false },
};

const copy = AUTH_COPY.signIn;

export default function Page() {
  return (
    <AuthShell
      footer={
        <>
          {copy.switchPrompt}{" "}
          <Link className={TEXT_LINK_CLASS} href="/sign-up">
            {copy.switchLink}
          </Link>
        </>
      }
      lead={copy.lead}
      title={copy.title}
    >
      <SignInForm />
    </AuthShell>
  );
}
