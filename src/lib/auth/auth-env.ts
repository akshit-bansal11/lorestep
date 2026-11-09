import { AUTH_PROVIDER_IDS } from "@/constants/auth/auth";
import type { AuthProviderId } from "@/types/auth/auth";

const read = (name: string) => {
  const value = process.env[name];
  return value === undefined || value === "" ? null : value;
};

/** A variable the server cannot run without. Throws at the call site, never at import. */
export function requiredEnv(name: string): string {
  const value = read(name);
  if (value === null) throw new Error(`${name} is not set. See .env.example.`);
  return value;
}

/** The app's own origin, from APP_ORIGIN. Throws when unset: an origin check cannot guess. */
export function appOrigin(): string {
  return new URL(requiredEnv("APP_ORIGIN")).origin;
}

/**
 * The OAuth buttons to show, from the comma list in AUTH_PROVIDERS. Neon Auth holds the provider
 * secrets; unknown names are ignored (PLAN.md section 12, N-7).
 */
export function authProviders(): AuthProviderId[] {
  const names = (read("AUTH_PROVIDERS") ?? "").split(",").map((name) => name.trim());
  return AUTH_PROVIDER_IDS.filter((id) => names.includes(id));
}

/** Password reset is offered only once custom SMTP is set up in Neon Auth (AUTH_RESET=true). */
export const resetEnabled = () => read("AUTH_RESET") === "true";

/** Neon Auth's issuer for Dogear tokens: NEON_AUTH_ISSUER, else the Auth base URL (N-4). */
export const authIssuer = () => read("NEON_AUTH_ISSUER") ?? requiredEnv("NEON_AUTH_BASE_URL");
