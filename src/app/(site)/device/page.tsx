import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import AuthField from "@/components/auth/AuthField";
import AuthMessage from "@/components/auth/AuthMessage";
import AuthShell from "@/components/auth/AuthShell";
import DeviceApproval from "@/components/auth/DeviceApproval";
import { DEVICE_USER_CODE_MAX } from "@/constants/auth/auth";
import { AUTH_PRIMARY_CLASS } from "@/constants/auth/classes";
import { AUTH_COPY } from "@/constants/auth/copy";
import { getAuth } from "@/lib/auth/auth";
import { checkDeviceRequest } from "@/lib/auth/check-device-request";

export const metadata: Metadata = {
  title: "Connect Dogear — Lorestep",
  robots: { index: false, follow: false },
};

const copy = AUTH_COPY.device;

interface PageProps {
  searchParams: Promise<{ user_code?: string | string[] }>;
}

/**
 * Dogear's device sign-in (RFC 8628), on the real origin. Signed out, it goes to sign-in and comes
 * back with the code. Without a code it asks for one; with one it checks it on the server (which
 * claims it for this user) and only then offers Approve and Deny.
 */
export default async function Page({ searchParams }: PageProps) {
  const raw = (await searchParams).user_code;
  const userCode = typeof raw === "string" ? raw.trim().slice(0, DEVICE_USER_CODE_MAX) : "";
  const requestHeaders = await headers();

  const session = await getAuth().api.getSession({ headers: requestHeaders });
  // A Dogear session is not a website sign-in (DECISIONS.md, sessions carry a client column).
  if (session === null || session.session.client === "dogear") {
    const back = userCode === "" ? "/device" : `/device?user_code=${encodeURIComponent(userCode)}`;
    redirect(`/sign-in?next=${encodeURIComponent(back)}`);
  }

  if (userCode === "") {
    return (
      <AuthShell lead={copy.enterLead} title={copy.title}>
        <form action="/device" className="flex flex-col gap-4" method="get">
          <AuthField
            autoComplete="one-time-code"
            disabled={false}
            error={undefined}
            label={copy.codeField}
            name="user_code"
            type="text"
          />
          <button className={AUTH_PRIMARY_CLASS} type="submit">
            {copy.enterSubmit}
          </button>
        </form>
      </AuthShell>
    );
  }

  const state = await checkDeviceRequest(userCode, requestHeaders);
  return (
    <AuthShell lead={copy.lead} title={copy.title}>
      {state === "pending" ? (
        <DeviceApproval userCode={userCode} />
      ) : (
        <div role="status">
          <AuthMessage>{state === "handled" ? copy.handled : copy.invalid}</AuthMessage>
        </div>
      )}
    </AuthShell>
  );
}
