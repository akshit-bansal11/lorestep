import { z } from "zod";

import { TITLE_CLEAN_MAX, YEAR_MAX, YEAR_MIN } from "@/constants/log/entries";
import { CANONICAL_STATUSES } from "@/constants/log/statuses";
import {
  PLATFORM_ID_PATTERN,
  SYNC_KINDS,
  SYNC_LIMITS,
  SYNC_PLATFORMS,
} from "@/constants/sync/sync";
import { cleanTitle } from "@/utils/log/norm-title";

/**
 * One Dogear mark (dogear/core/store.js `validEntry`, mapped through `D.WIRE`). Dogear sends `""`
 * for an unknown kind or URL; both read as absent. An unknown platform is a 400.
 */
export const syncMarkSchema = z.object({
  platform: z.enum(SYNC_PLATFORMS),
  platformId: z.string().min(1).max(SYNC_LIMITS.platformId).regex(PLATFORM_ID_PATTERN),
  title: z.string().max(TITLE_CLEAN_MAX).transform(cleanTitle).pipe(z.string().min(1)),
  kind: z
    .union([z.enum(SYNC_KINDS), z.literal("")])
    .optional()
    .transform((kind) => (kind === "" ? undefined : kind)),
  year: z.int().min(YEAR_MIN).max(YEAR_MAX).optional(),
  url: z
    .union([z.url({ protocol: /^https$/ }).max(SYNC_LIMITS.url), z.literal("")])
    .optional()
    .transform((url) => (url === "" ? undefined : url)),
  status: z.enum(CANONICAL_STATUSES).nullable(),
  /** Client epoch ms of the mark; the LWW clock. */
  at: z.int().positive(),
});

/** Body of POST /api/v1/sync/push. Marks apply in order. */
export const syncPushSchema = z.object({
  marks: z.array(syncMarkSchema).min(1).max(SYNC_LIMITS.pushMax),
});
