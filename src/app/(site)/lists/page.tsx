import type { Metadata } from "next";
import ListsApp from "@/components/log/ListsApp";
import { pageSession } from "@/lib/auth/page-session";

export const metadata: Metadata = {
  title: "Lists — Lorestep",
  robots: { index: false, follow: false },
};

/** The signed-in lists overview. Dynamic on purpose: its content belongs to one user. */
export default async function Page() {
  await pageSession("/lists");

  return <ListsApp />;
}
