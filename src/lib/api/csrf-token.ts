import { z } from "zod";

const tokenSchema = z.object({ data: z.object({ token: z.string().min(1) }) });

let cached: Promise<string | null> | null = null;

async function load(): Promise<string | null> {
  try {
    const response = await fetch("/api/v1/csrf", { headers: { accept: "application/json" } });
    if (!response.ok) return null;
    const parsed = tokenSchema.safeParse(await response.json());
    return parsed.success ? parsed.data.data.token : null;
  } catch (error) {
    console.warn("Could not read the CSRF token", error);
    return null;
  }
}

/**
 * The double-submit token for cookie-authenticated writes (PLAN.md section 11 Q3). One request per
 * page load; a failed read is not kept, so the next write asks again.
 */
export async function getCsrfToken(): Promise<string | null> {
  cached ??= load();
  const token = await cached;
  if (token === null) cached = null;
  return token;
}

/** Forget the token after the server rejected it, so the next write fetches a fresh one. */
export function forgetCsrfToken(): void {
  cached = null;
}
