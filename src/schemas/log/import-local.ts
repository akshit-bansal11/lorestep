import { z } from "zod";

import { LIBRARY_STATUSES } from "@/constants/log/statuses";
import { gameEntrySchema, gameIdSchema } from "@/schemas/log/entry";

/** One browser mark: a status is required, as the local store never keeps a mark without one. */
export const localMarkSchema = gameEntrySchema.extend({ status: z.enum(LIBRARY_STATUSES) });

/** Body of POST /api/v1/import/local. The 1000-mark cap is the service's (413, not 400). */
export const localImportSchema = z.strictObject({
  entries: z.record(gameIdSchema, localMarkSchema),
});
