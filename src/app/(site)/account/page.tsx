import type { Metadata } from "next";
import DeleteAccount from "@/components/account/DeleteAccount";
import DevicesList from "@/components/account/DevicesList";
import ExportButton from "@/components/account/ExportButton";
import ProfileCard from "@/components/account/ProfileCard";
import { ACCOUNT_COPY } from "@/constants/account/copy";
import { APP_TITLE_CLASS, PAGE_CLASS } from "@/constants/canon/ui";
import { pageSession } from "@/lib/auth/page-session";
import { listDeviceSessions } from "@/services/account/sessions";
import { cn } from "@/utils/cn";

export const metadata: Metadata = {
  title: "Account — Lorestep",
  robots: { index: false, follow: false },
};

/**
 * Profile, signed-in sessions, export and erasure. Dynamic by design (it reads the session
 * cookie), like `/library`. Sessions are read on the server, so no session token reaches the
 * browser. The extension holds no server-side session, so it is never listed (PLAN.md N-10).
 */
export default async function Page() {
  const { user, session } = await pageSession("/account");
  const devices = await listDeviceSessions();

  return (
    <main className={cn(PAGE_CLASS, "flex max-w-3xl flex-1 flex-col gap-6 py-8 lg:py-10")}>
      <h1 className={APP_TITLE_CLASS}>{ACCOUNT_COPY.title}</h1>
      <ProfileCard user={{ name: user.name, email: user.email, image: user.image ?? null }} />
      <DevicesList currentId={session.id} devices={devices} />
      <ExportButton />
      <DeleteAccount email={user.email} />
    </main>
  );
}
