import { z } from "zod";

import {
  ENTRY_LIMITS,
  EXT_SOURCES,
  RATING_MAX,
  RATING_MIN,
  YEAR_MAX,
  YEAR_MIN,
} from "@/constants/log/entries";
import { CANONICAL_STATUSES, LIBRARY_STATUSES, SHELVES } from "@/constants/log/statuses";
import { MEDIA_KINDS } from "@/constants/metadata/metadata";
import { isValidOption } from "@/utils/canon/entry-options";
import { cleanTitle } from "@/utils/log/norm-title";

const count = z.number().int().min(0).max(ENTRY_LIMITS.progressValue).optional();

/** `entries.progress` (jsonb): read and written whole. */
export const progressSchema = z.strictObject({
  episodes: count,
  seasons: count,
  chapters: count,
  volumes: count,
  playMinutes: count,
});

/** Device and storefront ids come from the same option lists as the games table. */
const option = (field: "device" | "storefront") =>
  z
    .string()
    .refine((id) => isValidOption(field, id), "Unknown option.")
    .nullable();

const instant = z.iso
  .datetime({ offset: true })
  .transform((value) => new Date(value))
  .nullable();

const entryFields = z.strictObject({
  kind: z.enum(MEDIA_KINDS),
  title: z.string().max(ENTRY_LIMITS.title).transform(cleanTitle).pipe(z.string().min(1)),
  year: z.number().int().min(YEAR_MIN).max(YEAR_MAX).nullable(),
  status: z.enum(CANONICAL_STATUSES).nullable(),
  shelf: z.enum(SHELVES).nullable(),
  rating: z.number().int().min(RATING_MIN).max(RATING_MAX).nullable(),
  notes: z.string().max(ENTRY_LIMITS.notes),
  progress: progressSchema,
  repeatCount: z.number().int().min(0).max(ENTRY_LIMITS.repeatCount),
  device: option("device"),
  storefront: option("storefront"),
  gameId: z.string().min(1).max(ENTRY_LIMITS.gameId).nullable(),
  ext: z
    .strictObject({
      source: z.enum(EXT_SOURCES),
      id: z.string().min(1).max(ENTRY_LIMITS.extId),
    })
    .nullable(),
  imageUrl: z
    .url({ protocol: /^https$/ })
    .max(ENTRY_LIMITS.imageUrl)
    .nullable(),
  startedAt: instant,
  completedAt: instant,
});

const GAME_ONLY = ["shelf", "device", "storefront", "gameId"] as const;

/** Body of POST /api/v1/entries. Game fields are rejected on other kinds. */
export const entryCreateSchema = entryFields
  .partial()
  .required({ kind: true, title: true })
  .superRefine((entry, ctx) => {
    if (entry.kind === "game") return;
    for (const field of GAME_ONLY) {
      if (entry[field] != null) {
        ctx.addIssue({ code: "custom", path: [field], message: "Only games have this field." });
      }
    }
  });

/**
 * Body of PATCH /api/v1/entries/:id. The kind is fixed at create; a game field on another kind is
 * refused by the `entries_shelf_game_only` CHECK and answered 400.
 */
export const entryPatchSchema = entryFields.omit({ kind: true }).partial();

/** Body of PUT /api/v1/entries/game/:gameId: the games table's three fields, replaced whole. */
export const gameEntrySchema = z.strictObject({
  status: z.enum(LIBRARY_STATUSES).nullable(),
  device: option("device").optional(),
  storefront: option("storefront").optional(),
});

/** Query of GET /api/v1/entries. `limit` is clamped to 1..100, never rejected. */
export const entryListQuerySchema = z.object({
  kind: z.enum(MEDIA_KINDS).optional(),
  status: z.enum(CANONICAL_STATUSES).optional(),
  q: z.string().trim().min(1).max(ENTRY_LIMITS.query).optional(),
  cursor: z.string().min(1).max(ENTRY_LIMITS.cursor).optional(),
  limit: z.coerce
    .number()
    .int()
    .catch(ENTRY_LIMITS.pageDefault)
    .transform((limit) => Math.min(Math.max(limit, 1), ENTRY_LIMITS.pageMax)),
});

export const entryIdSchema = z.uuid();
export const gameIdSchema = z.string().min(1).max(ENTRY_LIMITS.gameId);
