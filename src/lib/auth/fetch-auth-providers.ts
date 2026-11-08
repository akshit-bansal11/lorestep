import { z } from "zod";

import type { AuthProviders } from "@/types/auth/auth-form";

const providersSchema = z.object({
  data: z.object({ github: z.boolean(), google: z.boolean(), reset: z.boolean() }),
});

let pending: Promise<AuthProviders | null> | null = null;

async function load(): Promise<AuthProviders | null> {
  try {
    const response = await fetch("/api/v1/auth-providers", {
      headers: { accept: "application/json" },
    });
    if (!response.ok) return null;
    const parsed = providersSchema.safeParse(await response.json());
    return parsed.success ? parsed.data.data : null;
  } catch (error) {
    console.warn("Could not read the sign-in providers", error);
    return null;
  }
}

/**
 * Which sign-in options this deployment offers, or null when that could not be learned (limited,
 * offline, malformed). One request per page load: a success is reused, a failure is retried on the
 * next page load rather than hammering the limited endpoint.
 */
export function fetchAuthProviders(): Promise<AuthProviders | null> {
  pending ??= load();
  return pending;
}
