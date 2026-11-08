import type { NextRequest } from "next/server";

import { RATE_LIMITS } from "@/constants/http/rate-limits";
import { LIST_LIMITS } from "@/constants/log/lists";
import { guardMutation } from "@/lib/http/guard-mutation";
import { HttpError } from "@/lib/http/http-error";
import { readJson } from "@/lib/http/read-json";
import { fail, noContent } from "@/lib/http/respond";
import { listIdSchema, listOrderSchema } from "@/schemas/log/list";
import { reorderListItems } from "@/services/log/lists-service";
import type { ListRouteContext } from "@/types/log/list";

/** Set the order. `ids` must be exactly the list's items: a foreign or stale id is 400. */
export async function PUT(request: NextRequest, { params }: ListRouteContext) {
  try {
    const userId = await guardMutation(request, "lists", RATE_LIMITS.entriesWrite);
    const { id } = await params;
    if (!listIdSchema.safeParse(id).success) {
      throw new HttpError(404, "not_found", "That list does not exist.");
    }
    const body = listOrderSchema.safeParse(await readJson(request, LIST_LIMITS.bodyBytes));
    if (!body.success) throw new HttpError(400, "invalid_body", "Send the item ids in order.");
    await reorderListItems(userId, id, body.data.ids);
    return noContent();
  } catch (error) {
    return fail(error);
  }
}
