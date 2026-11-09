import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import ConsentCard from "@/components/auth/ConsentCard";
import OAuthInvalid from "@/components/auth/OAuthInvalid";
import { EXTENSION_AUDIENCE_PATH } from "@/constants/auth/auth";
import { OAUTH_COPY } from "@/constants/auth/oauth";
import { appOrigin } from "@/lib/auth/auth-env";
import {
  describeOAuthQuery,
  grantLines,
  readOAuthQuery,
  searchFromRecord,
} from "@/lib/auth/continue-oauth";
import { neonAuth } from "@/lib/auth/neon-auth";
import { optionalSession } from "@/lib/auth/page-session";
import type { SearchRecord } from "@/types/auth/oauth";

export const metadata: Metadata = {
  title: "Connect an app — Lorestep",
  robots: { index: false, follow: false },
};

/**
 * Neon Auth's OAuth consent page (PLAN.md section 12, N4). Shows the client name (from
 * `/oauth2/public-client`, never from the query), what it asks for in plain words, the account
 * and where the code goes, then Allow or Deny. Signed out, it hands the same request to
 * `/oauth/login`, which signs in and comes back through Neon.
 */
export default async function Page({ searchParams }: { searchParams: Promise<SearchRecord> }) {
  const oauthQuery = readOAuthQuery(searchFromRecord(await searchParams));
  if (oauthQuery === null) return <OAuthInvalid />;
  const signedIn = await optionalSession();
  if (signedIn === null) redirect(`/oauth/login?${oauthQuery}`);

  const request = describeOAuthQuery(oauthQuery);
  const { data, error } = await neonAuth().oauth2.publicClient({
    query: { client_id: request.clientId },
  });
  // An unknown client cannot carry Neon's signature, so an error here is Neon failing: fail
  // closed to the error boundary rather than ask the user to approve an unnamed app.
  if (error !== null && error !== undefined) throw new Error("Neon Auth is unavailable.");
  const clientName = data?.client_name ?? request.clientId;
  const grants = grantLines(request, `${appOrigin()}${EXTENSION_AUDIENCE_PATH}`);

  return (
    <AuthShell
      lead={OAUTH_COPY.consent.lead.replace("{name}", clientName)}
      title={OAUTH_COPY.consent.title.replace("{name}", clientName)}
    >
      <ConsentCard
        clientName={clientName}
        email={signedIn.user.email}
        grants={grants}
        redirectHost={request.redirectHost}
      />
    </AuthShell>
  );
}
