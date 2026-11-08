import { z } from "zod";

import { ENTRY_LIMITS } from "@/constants/log/entries";
import { MEDIA_KINDS } from "@/constants/metadata/metadata";
import { SYNC_LIMITS } from "@/constants/sync/sync";

/** Query of GET /api/v1/sync: `?since=<cursor>&limit<=500&kinds=movie,series,anime`. */
export const syncPullQuerySchema = z.object({
  since: z.string().min(1).max(ENTRY_LIMITS.cursor).optional(),
  limit: z.coerce
    .number()
    .int()
    .catch(SYNC_LIMITS.pullDefault)
    .transform((limit) => Math.min(Math.max(limit, 1), SYNC_LIMITS.pullMax)),
  kinds: z
    .string()
    .max(64)
    .transform((value) => value.split(","))
    .pipe(z.array(z.enum(MEDIA_KINDS)).min(1))
    .optional(),
});
