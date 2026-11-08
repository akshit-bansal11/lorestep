import type { NextRequest } from "next/server";

import { RATE_LIMITS } from "@/constants/http/rate-limits";
import { LIST_LIMITS } from "@/constants/log/lists";
import { guardMutation } from "@/lib/http/guard-mutation";
import { HttpError } from "@/lib/http/http-error";
import { readJson } from "@/lib/http/read-json";
import { fail, ok } from "@/lib/http/respond";
import { listIdSchema, listItemSchema } from "@/schemas/log/list";
import { addListItem } from "@/services/log/lists-service";
import type { ListRouteContext } from "@/types/log/list";

/** Append a title. 404 for another user's list; 409 `duplicate` (same external id) or `limit`. */
export async function POST(request: NextRequest, { params }: ListRouteContext) {
  try {
    const userId = await guardMutation(request, "lists", RATE_LIMITS.entriesWrite);
    const { id } = await params;
    if (!listIdSchema.safeParse(id).success) {
      throw new HttpError(404, "not_found", "That list does not exist.");
    }
    const body = listItemSchema.safeParse(await readJson(request, LIST_LIMITS.bodyBytes));
    if (!body.success) throw new HttpError(400, "invalid_body", "Check the title's fields.");
    return ok(await addListItem(userId, id, body.data), { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
