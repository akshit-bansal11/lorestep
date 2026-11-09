import { z } from "zod";

/** Body of POST /api/v1/resolve-link. Host policy is `assertSafeUrl`'s job, not the schema's. */
export const resolveBodySchema = z.object({
  url: z.string().trim().min(1).max(2048),
});

export type ResolveBody = z.infer<typeof resolveBodySchema>;
