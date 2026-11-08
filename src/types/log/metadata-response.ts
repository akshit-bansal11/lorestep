import type { z } from "zod";

import type { metadataResponseSchema } from "@/schemas/log/metadata-response";

export type MetadataResponse = z.infer<typeof metadataResponseSchema>;
