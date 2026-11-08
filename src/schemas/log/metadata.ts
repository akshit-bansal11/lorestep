import { z } from "zod";

import { MEDIA_KINDS } from "@/constants/metadata/metadata";

/** Query of GET /api/v1/metadata: a provider id, a title, or both. */
export const metadataParamsSchema = z
  .object({
    type: z.enum(MEDIA_KINDS),
    id: z.string().trim().min(1).max(40).optional(),
    title: z.string().trim().min(1).max(200).optional(),
    year: z
      .string()
      .regex(/^\d{4}$/)
      .optional(),
  })
  .refine((params) => params.id !== undefined || params.title !== undefined, {
    message: "Either id or title is required.",
  });

export type MetadataParams = z.infer<typeof metadataParamsSchema>;
