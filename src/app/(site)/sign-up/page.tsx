import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import SignUpForm from "@/components/auth/SignUpForm";
import { AUTH_COPY } from "@/constants/auth/copy";
import { TEXT_LINK_CLASS } from "@/constants/canon/ui";

export const metadata: Metadata = {
  title: "Create an account — Lorestep",
  robots: { index: false, follow: false },
};

const copy = AUTH_COPY.signUp;

export default function Page() {
  return (
    <AuthShell
      footer={
        <>
          {copy.switchPrompt}{" "}
          <Link className={TEXT_LINK_CLASS} href="/sign-in">
            {copy.switchLink}
          </Link>
        </>
      }
      lead={copy.lead}
      title={copy.title}
    >
      <SignUpForm />
    </AuthShell>
  );
}
