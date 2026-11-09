import { NextResponse } from "next/server";

import { RATE_LIMITS } from "@/constants/http/rate-limits";
import { requireUser } from "@/lib/auth/require-user";
import { enforceRateLimit } from "@/lib/http/enforce-rate-limit";
import { HttpError } from "@/lib/http/http-error";
import { fail } from "@/lib/http/respond";
import { getMetadata } from "@/lib/metadata";
import { getMissingFields } from "@/lib/metadata/merge";
import { metadataParamsSchema } from "@/schemas/log/metadata";

/** Enriched metadata for one title. Signed-in only; each call fans out to third-party APIs. */
export async function GET(request: Request) {
  try {
    const { userId } = await requireUser(request);
    await enforceRateLimit(`meta:${userId}`, RATE_LIMITS.metadata);

    const parsed = metadataParamsSchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!parsed.success) {
      throw new HttpError(400, "invalid_query", "Check the type, id, title and year.");
    }

    const { data, cached } = await getMetadata(parsed.data);
    if (data === null) {
      throw new HttpError(404, "not_found", `No metadata found for this ${parsed.data.type}.`);
    }

    const missingFields = getMissingFields(data, parsed.data.type);
    return NextResponse.json({
      data,
      cached,
      ...(missingFields.length > 0 ? { missingFields } : {}),
    });
  } catch (error) {
    return fail(error);
  }
}
