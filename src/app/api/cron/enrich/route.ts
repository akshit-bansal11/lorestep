import { assertCronSecret } from "@/lib/http/assert-cron-secret";
import { fail, ok } from "@/lib/http/respond";
import { enrichEntries } from "@/services/metadata/enrich-entries";

/** Daily metadata sweep, called by Vercel Cron (`vercel.json`) with `Bearer CRON_SECRET`. */
export async function GET(request: Request) {
  try {
    assertCronSecret(request);
    return ok({ enriched: await enrichEntries() });
  } catch (error) {
    return fail(error);
  }
}
