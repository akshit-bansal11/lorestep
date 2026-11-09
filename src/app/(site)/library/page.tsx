import type { Metadata } from "next";
import LibraryApp from "@/components/log/LibraryApp";
import { pageSession } from "@/lib/auth/page-session";

export const metadata: Metadata = {
  title: "Library — Lorestep",
  robots: { index: false, follow: false },
};

/**
 * The signed-in media log. Reading the session cookie makes this route dynamic on purpose: it is
 * the one page that must never be prerendered, since its content belongs to one user.
 */
export default async function Page() {
  await pageSession("/library");

  return <LibraryApp />;
}
