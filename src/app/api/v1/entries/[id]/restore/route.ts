import type { NextRequest } from "next/server";

import { RATE_LIMITS } from "@/constants/http/rate-limits";
import { guardMutation } from "@/lib/http/guard-mutation";
import { HttpError } from "@/lib/http/http-error";
import { fail, ok } from "@/lib/http/respond";
import { entryIdSchema } from "@/schemas/log/entry";
import { restoreEntry } from "@/services/log/entries-service";
import type { EntryRouteContext } from "@/types/log/entry";

/** Undo a delete (D-16): the same row comes back while its tombstone is inside the purge window. */
export async function POST(request: NextRequest, { params }: EntryRouteContext) {
  try {
    const userId = await guardMutation(request, "entries", RATE_LIMITS.entriesWrite);
    const { id } = await params;
    const entry = entryIdSchema.safeParse(id).success ? await restoreEntry(userId, id) : null;
    if (entry === null) {
      throw new HttpError(404, "not_found", "That entry is not in your library.");
    }
    return ok(entry);
  } catch (error) {
    return fail(error);
  }
}
