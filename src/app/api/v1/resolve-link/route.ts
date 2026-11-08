import type { NextRequest } from "next/server";

import { RATE_LIMITS } from "@/constants/http/rate-limits";
import { ENTRY_LIMITS } from "@/constants/log/entries";
import { requireUser } from "@/lib/auth/require-user";
import { assertSameOrigin } from "@/lib/http/assert-same-origin";
import { enforceRateLimit } from "@/lib/http/enforce-rate-limit";
import { UnsafeUrlError } from "@/lib/http/guard-url";
import { HttpError } from "@/lib/http/http-error";
import { readJson } from "@/lib/http/read-json";
import { fail, ok } from "@/lib/http/respond";
import { resolveLink } from "@/lib/resolve";
import { resolveBodySchema } from "@/schemas/log/resolve";

const UNSUPPORTED = "Unsupported link. Use IMDb, TMDB, MyAnimeList, Netflix or Prime Video.";

/** Resolve a pasted IMDb, TMDB, MAL, Netflix or Prime Video link. Signed-in only. */
export async function POST(request: NextRequest) {
  try {
    const { userId, via } = await requireUser(request);
    if (via === "session") assertSameOrigin(request);
    await enforceRateLimit(`resolve:${userId}`, RATE_LIMITS.resolveLink);

    const body = resolveBodySchema.safeParse(await readJson(request, ENTRY_LIMITS.bodyBytes));
    if (!body.success) throw new HttpError(400, "invalid_body", "Send a JSON body with a url.");

    const media = await resolveLink(body.data.url);
    if (media === null) {
      throw new HttpError(422, "unresolvable", "Nothing could be read from this link.");
    }
    return ok(media);
  } catch (error) {
    if (error instanceof UnsafeUrlError) {
      return fail(new HttpError(422, "unsupported_host", UNSUPPORTED));
    }
    return fail(error);
  }
}
