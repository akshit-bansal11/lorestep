import { redirect } from "next/navigation";

import { neonAuth } from "@/lib/auth/neon-auth";

/**
 * The signed-in session for a protected page, or a redirect to `/sign-in?next=<next>`. Reading the
 * cookie makes the page dynamic on purpose. Neon Auth answering an error throws to the error
 * boundary (fail closed, BE-06), never reads as signed out.
 */
export async function pageSession(next: string) {
  const { data, error } = await neonAuth().getSession();
  if (error !== null && error !== undefined) throw new Error("Neon Auth is unavailable.");
  const user = data?.user;
  const session = data?.session;
  if (user === null || user === undefined || session === null || session === undefined) {
    redirect(`/sign-in?next=${next}`);
  }
  return { user, session };
}
