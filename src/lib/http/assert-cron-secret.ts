import { createHash, timingSafeEqual } from "node:crypto";

import { HttpError } from "@/lib/http/http-error";

const digest = (value: string) => createHash("sha256").update(value).digest();

/**
 * Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`. Both sides are hashed to equal length
 * before `timingSafeEqual`, so the compare leaks neither the secret nor its length. Fails CLOSED:
 * without CRON_SECRET every call is 401 (logged, so the misconfiguration is seen).
 */
export function assertCronSecret(request: Request): void {
  const unauthorized = new HttpError(401, "unauthorized", "Missing or wrong cron secret.");
  const secret = process.env.CRON_SECRET;
  if (secret === undefined || secret === "") {
    console.error("CRON_SECRET is not set; the cron route refuses every call.");
    throw unauthorized;
  }
  const given = digest(request.headers.get("authorization") ?? "");
  if (!timingSafeEqual(given, digest(`Bearer ${secret}`))) throw unauthorized;
}
