import type { MailCredentials, OAuthCredentials } from "@/types/auth/auth";

const read = (name: string) => {
  const value = process.env[name];
  return value === undefined || value === "" ? null : value;
};

function oauth(idVar: string, secretVar: string): OAuthCredentials | null {
  const clientId = read(idVar);
  const clientSecret = read(secretVar);
  return clientId === null || clientSecret === null ? null : { clientId, clientSecret };
}

/** A provider is enabled only when both of its variables are set (PLAN.md section 6). */
export const githubCredentials = () => oauth("GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET");
export const googleCredentials = () => oauth("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET");

/** Reset email needs both the Resend key and a sender; without them reset answers 503. */
export function mailCredentials(): MailCredentials | null {
  const apiKey = read("RESEND_API_KEY");
  const from = read("MAIL_FROM");
  return apiKey === null || from === null ? null : { apiKey, from };
}

/** The app's own origin, from BETTER_AUTH_URL. Throws when unset: an origin check cannot guess. */
export function appOrigin(): string {
  const url = read("BETTER_AUTH_URL");
  if (url === null) throw new Error("BETTER_AUTH_URL is not set. See .env.example.");
  return new URL(url).origin;
}
