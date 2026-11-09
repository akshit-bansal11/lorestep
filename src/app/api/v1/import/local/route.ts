import type { NextRequest } from "next/server";

import { RATE_LIMITS } from "@/constants/http/rate-limits";
import { ENTRY_LIMITS } from "@/constants/log/entries";
import { requireSessionUser } from "@/lib/auth/require-session-user";
import { assertSameOrigin } from "@/lib/http/assert-same-origin";
import { enforceRateLimit } from "@/lib/http/enforce-rate-limit";
import { HttpError } from "@/lib/http/http-error";
import { readJson } from "@/lib/http/read-json";
import { fail, ok } from "@/lib/http/respond";
import { localImportSchema } from "@/schemas/log/import-local";
import { importLocal } from "@/services/log/import-local";

/**
 * Copies this browser's games-table marks into the caller's library: `{inserted, skipped}`.
 * Insert-if-absent, so repeating it is harmless. 413 past 1000 marks or 256 KB. Browser session
 * only (a bearer token = 401), CSRF-checked: it is the website's one-time import.
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await requireSessionUser(request);
    assertSameOrigin(request);
    await enforceRateLimit(`import:${userId}`, RATE_LIMITS.importLocal);
    const body = localImportSchema.safeParse(await readJson(request, ENTRY_LIMITS.importBytes));
    if (!body.success) throw new HttpError(400, "invalid_body", "Send the marks to import.");
    return ok(await importLocal(userId, body.data.entries));
  } catch (error) {
    return fail(error);
  }
}
