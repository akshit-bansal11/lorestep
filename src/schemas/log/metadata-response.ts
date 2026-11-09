import { z } from "zod";

/** The slice of `/api/v1/metadata` the add dialog reads. */
export const metadataResponseSchema = z.object({
  data: z.object({
    title: z.string().optional(),
    year: z.string().optional(),
    image: z.string().nullable().optional(),
  }),
  missingFields: z.array(z.string()).optional(),
});
