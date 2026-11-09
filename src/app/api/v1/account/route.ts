import type { NextRequest } from "next/server";

import { ACCOUNT_LIMITS } from "@/constants/account/account";
import { RATE_LIMITS } from "@/constants/http/rate-limits";
import { requireSessionAccount } from "@/lib/auth/require-session-account";
import { assertSameOrigin } from "@/lib/http/assert-same-origin";
import { enforceRateLimit } from "@/lib/http/enforce-rate-limit";
import { HttpError } from "@/lib/http/http-error";
import { readJson } from "@/lib/http/read-json";
import { fail, noContent } from "@/lib/http/respond";
import { eraseSchema } from "@/schemas/account/erase";
import { eraseAccount } from "@/services/account/erase";

/**
 * Erase the account (SEC-22). Browser session only, CSRF-checked, and `{confirm}` must be the
 * account's email. 204 once every user row and the Neon Auth user are gone; 502
 * `erase_incomplete` when the data is gone but Neon Auth refused (retry is safe, PLAN.md N-10).
 */
export async function DELETE(request: NextRequest) {
  try {
    const account = await requireSessionAccount(request);
    assertSameOrigin(request);
    await enforceRateLimit(`account:${account.userId}`, RATE_LIMITS.accountWrite);
    const body = eraseSchema.safeParse(await readJson(request, ACCOUNT_LIMITS.bodyBytes));
    if (!body.success) {
      throw new HttpError(400, "invalid_body", "Type your account's email to confirm.");
    }
    await eraseAccount(account, body.data.confirm);
    return noContent();
  } catch (error) {
    return fail(error);
  }
}
