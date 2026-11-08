import { assertCronSecret } from "@/lib/http/assert-cron-secret";
import { fail, ok } from "@/lib/http/respond";
import { purgeExpired } from "@/services/account/purge";

/** Daily purge, called by Vercel Cron (`vercel.json`) with `Authorization: Bearer CRON_SECRET`. */
export async function GET(request: Request) {
  try {
    assertCronSecret(request);
    return ok({ purged: await purgeExpired(new Date()) });
  } catch (error) {
    return fail(error);
  }
}
