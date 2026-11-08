import type { NextRequest } from "next/server";

import { RATE_LIMITS } from "@/constants/http/rate-limits";
import { guardMutation } from "@/lib/http/guard-mutation";
import { HttpError } from "@/lib/http/http-error";
import { fail, noContent } from "@/lib/http/respond";
import { listIdSchema } from "@/schemas/log/list";
import { deleteListItem } from "@/services/log/lists-service";
import type { ListItemRouteContext } from "@/types/log/list";

/** Remove a title from a list. Unknown, malformed or foreign ids are all 404. */
export async function DELETE(request: NextRequest, { params }: ListItemRouteContext) {
  try {
    const userId = await guardMutation(request, "lists", RATE_LIMITS.entriesWrite);
    const { id, itemId } = await params;
    if (
      !listIdSchema.safeParse(id).success ||
      !listIdSchema.safeParse(itemId).success ||
      !(await deleteListItem(userId, id, itemId))
    ) {
      throw new HttpError(404, "not_found", "That title is not in this list.");
    }
    return noContent();
  } catch (error) {
    return fail(error);
  }
}
