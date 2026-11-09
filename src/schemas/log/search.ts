import { z } from "zod";

import { MEDIA_KINDS } from "@/constants/metadata/metadata";

/** Query of GET /api/v1/search. */
export const searchParamsSchema = z.object({
  q: z.string().trim().min(1).max(200),
  type: z.enum(MEDIA_KINDS).optional(),
});

export type SearchParams = z.infer<typeof searchParamsSchema>;
