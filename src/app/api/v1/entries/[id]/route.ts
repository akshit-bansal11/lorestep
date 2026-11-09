import type { NextRequest } from "next/server";

import { RATE_LIMITS } from "@/constants/http/rate-limits";
import { ENTRY_LIMITS } from "@/constants/log/entries";
import { requireUser } from "@/lib/auth/require-user";
import { guardMutation } from "@/lib/http/guard-mutation";
import { HttpError } from "@/lib/http/http-error";
import { readJson } from "@/lib/http/read-json";
import { fail, noContent, ok } from "@/lib/http/respond";
import { entryIdSchema, entryPatchSchema } from "@/schemas/log/entry";
import { deleteEntry, getEntry, updateEntry } from "@/services/log/entries-service";
import type { EntryRouteContext } from "@/types/log/entry";

const notFound = () => new HttpError(404, "not_found", "That entry is not in your library.");

/** A malformed id is answered like a foreign one: 404, never a query. */
async function entryId({ params }: EntryRouteContext): Promise<string> {
  const { id } = await params;
  if (!entryIdSchema.safeParse(id).success) throw notFound();
  return id;
}

export async function GET(request: NextRequest, context: EntryRouteContext) {
  try {
    const { userId } = await requireUser(request);
    const entry = await getEntry(userId, await entryId(context));
    if (entry === null) throw notFound();
    return ok(entry);
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: NextRequest, context: EntryRouteContext) {
  try {
    const userId = await guardMutation(request, "entries", RATE_LIMITS.entriesWrite);
    const id = await entryId(context);
    const body = entryPatchSchema.safeParse(await readJson(request, ENTRY_LIMITS.bodyBytes));
    if (!body.success) throw new HttpError(400, "invalid_body", "Check the entry's fields.");
    const entry = await updateEntry(userId, id, body.data);
    if (entry === null) throw notFound();
    return ok(entry);
  } catch (error) {
    return fail(error);
  }
}

/** Soft delete (D-16): the row stays as a sync tombstone until the purge cron. */
export async function DELETE(request: NextRequest, context: EntryRouteContext) {
  try {
    const userId = await guardMutation(request, "entries", RATE_LIMITS.entriesWrite);
    if (!(await deleteEntry(userId, await entryId(context)))) throw notFound();
    return noContent();
  } catch (error) {
    return fail(error);
  }
}
