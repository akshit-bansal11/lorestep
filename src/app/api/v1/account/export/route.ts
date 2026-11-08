import { RATE_LIMITS } from "@/constants/http/rate-limits";
import { requireSessionUser } from "@/lib/auth/require-session-user";
import { enforceRateLimit } from "@/lib/http/enforce-rate-limit";
import { fail, ok } from "@/lib/http/respond";
import { exportAccount } from "@/services/account/export";

/** The caller's data as a JSON download (SEC-22). Browser session only; never cached. */
export async function GET(request: Request) {
  try {
    const userId = await requireSessionUser(request);
    await enforceRateLimit(`export:${userId}`, RATE_LIMITS.accountExport);
    const data = await exportAccount(userId);
    return ok(data, {
      headers: {
        "cache-control": "private, no-store",
        "content-disposition": `attachment; filename="lorestep-export-${data.exportedAt.slice(0, 10)}.json"`,
      },
    });
  } catch (error) {
    return fail(error);
  }
}
