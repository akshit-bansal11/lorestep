import { RATE_LIMITS } from "@/constants/http/rate-limits";
import { requireUser } from "@/lib/auth/require-user";
import { enforceRateLimit } from "@/lib/http/enforce-rate-limit";
import { HttpError } from "@/lib/http/http-error";
import { fail, ok } from "@/lib/http/respond";
import { searchMedia } from "@/lib/search";
import { searchParamsSchema } from "@/schemas/log/search";

/** Multi-provider title search (at most 30 results). Signed-in only. */
export async function GET(request: Request) {
  try {
    const { userId } = await requireUser(request);
    await enforceRateLimit(`search:${userId}`, RATE_LIMITS.search);

    const parsed = searchParamsSchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!parsed.success) {
      throw new HttpError(400, "invalid_query", "Enter a search term, and a valid type if any.");
    }

    const { results, errors } = await searchMedia(parsed.data);
    if (results.length === 0 && errors.length > 0) {
      throw new HttpError(502, "provider_unavailable", errors.join(" "));
    }
    return ok(results);
  } catch (error) {
    return fail(error);
  }
}
