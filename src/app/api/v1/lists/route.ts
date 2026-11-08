import type { NextRequest } from "next/server";

import { RATE_LIMITS } from "@/constants/http/rate-limits";
import { LIST_LIMITS } from "@/constants/log/lists";
import { requireUser } from "@/lib/auth/require-user";
import { guardMutation } from "@/lib/http/guard-mutation";
import { HttpError } from "@/lib/http/http-error";
import { readJson } from "@/lib/http/read-json";
import { fail, ok } from "@/lib/http/respond";
import { listCreateSchema } from "@/schemas/log/list";
import { createList, listLists } from "@/services/log/lists-service";

/** The caller's lists, newest-updated first. */
export async function GET(request: Request) {
  try {
    const { userId } = await requireUser(request);
    return ok(await listLists(userId));
  } catch (error) {
    return fail(error);
  }
}

/** Add a list. 409 `duplicate` (same name) or `limit` (50 lists). */
export async function POST(request: NextRequest) {
  try {
    const userId = await guardMutation(request, "lists", RATE_LIMITS.entriesWrite);
    const body = listCreateSchema.safeParse(await readJson(request, LIST_LIMITS.bodyBytes));
    if (!body.success) throw new HttpError(400, "invalid_body", "Check the list's name and kinds.");
    return ok(await createList(userId, body.data), { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
