import { redirect } from "next/navigation";
import { connection } from "next/server";

import { neonAuth } from "@/lib/auth/neon-auth";

/**
 * The signed-in session, or null when signed out. Reading the cookie makes the page dynamic on
 * purpose. Neon Auth answering an error throws to the error boundary (fail closed, BE-06), never
 * reads as signed out.
 */
export async function optionalSession() {
  // Opt into per-request rendering BEFORE asking Neon: getSession() swallows Next's dynamic-usage
  // bailout into `error`, which would otherwise read as an outage during prerender.
  await connection();
  const { data, error } = await neonAuth().getSession();
  if (error !== null && error !== undefined) throw new Error("Neon Auth is unavailable.");
  const user = data?.user;
  const session = data?.session;
  if (user === null || user === undefined || session === null || session === undefined) {
    return null;
  }
  return { user, session };
}

/** The signed-in session for a protected page, or a redirect to `/sign-in?next=<next>`. */
export async function pageSession(next: string) {
  const signedIn = await optionalSession();
  if (signedIn === null) redirect(`/sign-in?next=${next}`);
  return signedIn;
}
