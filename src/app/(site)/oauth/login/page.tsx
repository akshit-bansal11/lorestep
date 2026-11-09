import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import OAuthContinue from "@/components/auth/OAuthContinue";
import OAuthInvalid from "@/components/auth/OAuthInvalid";
import SignInForm from "@/components/auth/SignInForm";
import { AUTH_COPY } from "@/constants/auth/copy";
import { OAUTH_COPY } from "@/constants/auth/oauth";
import { TEXT_LINK_CLASS } from "@/constants/canon/ui";
import { isExtensionClient, readOAuthQuery, searchFromRecord } from "@/lib/auth/continue-oauth";
import { optionalSession } from "@/lib/auth/page-session";
import type { SearchRecord } from "@/types/auth/oauth";

export const metadata: Metadata = {
  title: "Sign in to connect an app — Lorestep",
  robots: { index: false, follow: false },
};

/**
 * Neon Auth's OAuth login page (PLAN.md section 12, N4). Neon's authorize endpoint sends the
 * browser here with a signed `oauth_query` whenever it sees no session, which is always: the
 * session cookie lives on this origin, not Neon's. Signed out, the usual sign-in form runs and
 * the Neon client attaches the query to its POST; signed in, one click continues the request.
 */
export default async function Page({ searchParams }: { searchParams: Promise<SearchRecord> }) {
  const oauthQuery = readOAuthQuery(searchFromRecord(await searchParams));
  if (oauthQuery === null || !isExtensionClient(oauthQuery)) return <OAuthInvalid />;
  const signedIn = await optionalSession();
  const signUpNext = encodeURIComponent(`/oauth/login?${oauthQuery}`);

  return (
    <AuthShell
      footer={
        signedIn === null ? (
          <>
            {AUTH_COPY.signIn.switchPrompt}{" "}
            <Link className={TEXT_LINK_CLASS} href={`/sign-up?next=${signUpNext}`}>
              {AUTH_COPY.signIn.switchLink}
            </Link>
          </>
        ) : undefined
      }
      lead={OAUTH_COPY.login.lead}
      title={OAUTH_COPY.login.title}
    >
      {signedIn === null ? <SignInForm oauth /> : <OAuthContinue email={signedIn.user.email} />}
    </AuthShell>
  );
}
