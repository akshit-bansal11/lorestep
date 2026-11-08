import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import ListsApp from "@/components/log/ListsApp";
import { getAuth } from "@/lib/auth/auth";

export const metadata: Metadata = {
  title: "Lists — Lorestep",
  robots: { index: false, follow: false },
};

/** The signed-in lists overview. Dynamic on purpose: its content belongs to one user. */
export default async function Page() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (session === null) redirect("/sign-in?next=/lists");

  return <ListsApp />;
}
