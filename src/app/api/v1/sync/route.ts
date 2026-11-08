import { RATE_LIMITS } from "@/constants/http/rate-limits";
import { requireBearerUser } from "@/lib/auth/require-bearer-user";
import { enforceRateLimit } from "@/lib/http/enforce-rate-limit";
import { HttpError } from "@/lib/http/http-error";
import { fail, ok } from "@/lib/http/respond";
import { syncPullQuerySchema } from "@/schemas/sync/pull";
import { pullChanges } from "@/services/sync/pull";

/** Dogear pull: `?since&limit&kinds`, changes after the cursor, tombstones included. */
export async function GET(request: Request) {
  try {
    const { userId } = await requireBearerUser(request);
    await enforceRateLimit(`sync-pull:${userId}`, RATE_LIMITS.syncPull);
    const query = syncPullQuerySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!query.success) {
      throw new HttpError(400, "invalid_query", "Check the since, limit and kinds parameters.");
    }
    return ok(await pullChanges(userId, query.data));
  } catch (error) {
    return fail(error);
  }
}
