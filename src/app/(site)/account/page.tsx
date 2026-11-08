import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import DeleteAccount from "@/components/account/DeleteAccount";
import DevicesList from "@/components/account/DevicesList";
import ExportButton from "@/components/account/ExportButton";
import ProfileCard from "@/components/account/ProfileCard";
import { ACCOUNT_COPY } from "@/constants/account/copy";
import { PAGE_CLASS, PAGE_TITLE_CLASS } from "@/constants/canon/ui";
import { getAuth } from "@/lib/auth/auth";
import { listDeviceSessions } from "@/services/account/sessions";
import { cn } from "@/utils/cn";

export const metadata: Metadata = {
  title: "Account — Lorestep",
  robots: { index: false, follow: false },
};

/**
 * Profile, signed-in devices, export and erasure. Dynamic by design (it reads the session cookie),
 * like `/library`. Devices are read on the server, so no session token reaches the browser.
 */
export default async function Page() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (session === null) redirect("/sign-in?next=/account");

  const { user } = session;
  const devices = await listDeviceSessions(user.id);

  return (
    <main className={cn(PAGE_CLASS, "flex max-w-3xl flex-1 flex-col gap-6 py-8 lg:py-10")}>
      <h1 className={PAGE_TITLE_CLASS}>{ACCOUNT_COPY.title}</h1>
      <ProfileCard user={{ name: user.name, email: user.email, image: user.image ?? null }} />
      <DevicesList currentId={session.session.id} devices={devices} />
      <ExportButton />
      <DeleteAccount email={user.email} />
    </main>
  );
}
