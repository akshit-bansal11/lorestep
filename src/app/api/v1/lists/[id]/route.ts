import type { NextRequest } from "next/server";

import { RATE_LIMITS } from "@/constants/http/rate-limits";
import { LIST_LIMITS } from "@/constants/log/lists";
import { requireUser } from "@/lib/auth/require-user";
import { guardMutation } from "@/lib/http/guard-mutation";
import { HttpError } from "@/lib/http/http-error";
import { readJson } from "@/lib/http/read-json";
import { fail, noContent, ok } from "@/lib/http/respond";
import { listIdSchema, listPatchSchema } from "@/schemas/log/list";
import { deleteList, getList, updateList } from "@/services/log/lists-service";
import type { ListRouteContext } from "@/types/log/list";

const notFound = () => new HttpError(404, "not_found", "That list does not exist.");

/** A malformed id is answered like a foreign one: 404, never a query. */
async function listId({ params }: ListRouteContext): Promise<string> {
  const { id } = await params;
  if (!listIdSchema.safeParse(id).success) throw notFound();
  return id;
}

export async function GET(request: NextRequest, context: ListRouteContext) {
  try {
    const { userId } = await requireUser(request);
    const list = await getList(userId, await listId(context));
    if (list === null) throw notFound();
    return ok(list);
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: NextRequest, context: ListRouteContext) {
  try {
    const userId = await guardMutation(request, "lists", RATE_LIMITS.entriesWrite);
    const id = await listId(context);
    const body = listPatchSchema.safeParse(await readJson(request, LIST_LIMITS.bodyBytes));
    if (!body.success) throw new HttpError(400, "invalid_body", "Check the list's fields.");
    const list = await updateList(userId, id, body.data);
    if (list === null) throw notFound();
    return ok(list);
  } catch (error) {
    return fail(error);
  }
}

/** Soft delete (D-16): the list and its items stay until the purge cron. */
export async function DELETE(request: NextRequest, context: ListRouteContext) {
  try {
    const userId = await guardMutation(request, "lists", RATE_LIMITS.entriesWrite);
    if (!(await deleteList(userId, await listId(context)))) throw notFound();
    return noContent();
  } catch (error) {
    return fail(error);
  }
}
