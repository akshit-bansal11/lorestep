import { z } from "zod";

import { ENTRY_LIMITS, EXT_SOURCES, YEAR_MAX, YEAR_MIN } from "@/constants/log/entries";
import { LIST_LIMITS } from "@/constants/log/lists";
import { MEDIA_KINDS } from "@/constants/metadata/metadata";
import { cleanTitle } from "@/utils/log/norm-title";

const listFields = z.strictObject({
  name: z.string().trim().min(1).max(LIST_LIMITS.name),
  description: z.string().max(LIST_LIMITS.description),
  kinds: z
    .array(z.enum(MEDIA_KINDS))
    .max(MEDIA_KINDS.length)
    .refine((kinds) => new Set(kinds).size === kinds.length, "Duplicate kind."),
});

/** Body of POST /api/v1/lists. */
export const listCreateSchema = listFields.partial().required({ name: true });

/** Body of PATCH /api/v1/lists/:id. */
export const listPatchSchema = listFields.partial();

/** Body of POST /api/v1/lists/:id/items. An external id needs its source and the other way round. */
export const listItemSchema = z
  .strictObject({
    kind: z.enum(MEDIA_KINDS),
    title: z.string().max(ENTRY_LIMITS.title).transform(cleanTitle).pipe(z.string().min(1)),
    year: z.number().int().min(YEAR_MIN).max(YEAR_MAX).nullable().optional(),
    extSource: z.enum(EXT_SOURCES).optional(),
    extId: z.string().min(1).max(ENTRY_LIMITS.extId).optional(),
    imageUrl: z
      .url({ protocol: /^https$/ })
      .max(ENTRY_LIMITS.imageUrl)
      .optional(),
  })
  .refine((item) => (item.extSource === undefined) === (item.extId === undefined), {
    path: ["extId"],
    message: "extSource and extId go together.",
  });

/** Body of PUT /api/v1/lists/:id/items/order. */
export const listOrderSchema = z.strictObject({
  ids: z
    .array(z.uuid())
    .max(LIST_LIMITS.itemsPerList)
    .refine((ids) => new Set(ids).size === ids.length, "Duplicate id."),
});

export const listIdSchema = z.uuid();
