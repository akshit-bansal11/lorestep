import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import LibraryApp from "@/components/log/LibraryApp";
import { getAuth } from "@/lib/auth/auth";

export const metadata: Metadata = {
  title: "Library — Lorestep",
  robots: { index: false, follow: false },
};

/**
 * The signed-in media log. Reading the session cookie makes this route dynamic on purpose: it is
 * the one page that must never be prerendered, since its content belongs to one user.
 */
export default async function Page() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (session === null) redirect("/sign-in?next=/library");

  return <LibraryApp />;
}
