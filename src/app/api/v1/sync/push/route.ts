import { after } from "next/server";

import { RATE_LIMITS } from "@/constants/http/rate-limits";
import { SYNC_LIMITS } from "@/constants/sync/sync";
import { requireBearerUser } from "@/lib/auth/require-bearer-user";
import { enforceRateLimit } from "@/lib/http/enforce-rate-limit";
import { HttpError } from "@/lib/http/http-error";
import { readJson } from "@/lib/http/read-json";
import { fail, ok } from "@/lib/http/respond";
import { syncPushSchema } from "@/schemas/sync/push";
import { enrichEntries } from "@/services/metadata/enrich-entries";
import { pushMarks } from "@/services/sync/push";

/**
 * Extension push: up to 200 marks, applied in order, last write wins, safe to resend. After the
 * response, the caller's new entries get their year and poster looked up.
 */
export async function POST(request: Request) {
  try {
    const { userId } = await requireBearerUser(request);
    await enforceRateLimit(`sync-push:${userId}`, RATE_LIMITS.syncPush);
    const body = syncPushSchema.safeParse(await readJson(request, SYNC_LIMITS.pushBytes));
    if (!body.success) {
      throw new HttpError(400, "invalid_body", "Check each mark's platform, id, title and status.");
    }
    const outcome = await pushMarks(userId, body.data.marks);
    if (outcome.applied > 0) {
      after(async () => {
        try {
          await enrichEntries(userId);
        } catch (error) {
          console.error("Metadata enrichment after push failed", error);
        }
      });
    }
    return ok(outcome);
  } catch (error) {
    return fail(error);
  }
}
