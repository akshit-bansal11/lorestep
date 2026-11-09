import { RATE_LIMITS } from "@/constants/http/rate-limits";
import { SYNC_LIMITS } from "@/constants/sync/sync";
import { requireBearerUser } from "@/lib/auth/require-bearer-user";
import { enforceRateLimit } from "@/lib/http/enforce-rate-limit";
import { HttpError } from "@/lib/http/http-error";
import { readJson } from "@/lib/http/read-json";
import { fail, ok } from "@/lib/http/respond";
import { syncPushSchema } from "@/schemas/sync/push";
import { pushMarks } from "@/services/sync/push";

/** Extension push: up to 200 marks, applied in order, last write wins, safe to resend. */
export async function POST(request: Request) {
  try {
    const { userId } = await requireBearerUser(request);
    await enforceRateLimit(`sync-push:${userId}`, RATE_LIMITS.syncPush);
    const body = syncPushSchema.safeParse(await readJson(request, SYNC_LIMITS.pushBytes));
    if (!body.success) {
      throw new HttpError(400, "invalid_body", "Check each mark's platform, id, title and status.");
    }
    return ok(await pushMarks(userId, body.data.marks));
  } catch (error) {
    return fail(error);
  }
}
