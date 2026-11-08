import type { NextRequest } from "next/server";

import { RATE_LIMITS } from "@/constants/http/rate-limits";
import { ENTRY_LIMITS } from "@/constants/log/entries";
import { requireUser } from "@/lib/auth/require-user";
import { guardMutation } from "@/lib/http/guard-mutation";
import { HttpError } from "@/lib/http/http-error";
import { readJson } from "@/lib/http/read-json";
import { fail, ok } from "@/lib/http/respond";
import { entryCreateSchema, entryListQuerySchema } from "@/schemas/log/entry";
import { createEntry, listEntries } from "@/services/log/entries-service";

/** The caller's library, newest-updated first, `?kind&status&q&cursor&limit`. */
export async function GET(request: Request) {
  try {
    const { userId } = await requireUser(request);
    const query = entryListQuerySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!query.success) {
      throw new HttpError(400, "invalid_query", "Check the kind, status and search filters.");
    }
    return ok(await listEntries(userId, query.data));
  } catch (error) {
    return fail(error);
  }
}

/** Add an entry. 409 `duplicate` (same game or external id) or `limit` (library full). */
export async function POST(request: NextRequest) {
  try {
    const userId = await guardMutation(request, "entries", RATE_LIMITS.entriesWrite);
    const body = entryCreateSchema.safeParse(await readJson(request, ENTRY_LIMITS.bodyBytes));
    if (!body.success) throw new HttpError(400, "invalid_body", "Check the entry's fields.");
    return ok(await createEntry(userId, body.data), { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
