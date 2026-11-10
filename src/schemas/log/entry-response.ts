import { z } from "zod";

import { progressSchema } from "@/schemas/log/entry";
import type { Entry, EntryPage } from "@/types/log/entry";
import type { SearchResult } from "@/types/metadata/metadata";

/** What the browser trusts about an entry coming back from `/api/v1/entries` (client-side parse). */
export const entryResponseSchema: z.ZodType<Entry> = z.object({
  id: z.string(),
  kind: z.string(),
  title: z.string(),
  year: z.number().nullable(),
  status: z.string().nullable(),
  shelf: z.string().nullable(),
  rating: z.number().nullable(),
  notes: z.string(),
  progress: progressSchema,
  repeatCount: z.number(),
  device: z.string().nullable(),
  storefront: z.string().nullable(),
  gameId: z.string().nullable(),
  ext: z.object({ source: z.string(), id: z.string() }).nullable(),
  imageUrl: z.string().nullable(),
  statusAt: z.string().nullable(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const entryPageResponseSchema: z.ZodType<EntryPage> = z.object({
  items: z.array(entryResponseSchema),
  nextCursor: z.string().nullable(),
});

export const searchResultsResponseSchema: z.ZodType<SearchResult[]> = z.array(
  z.object({
    id: z.string(),
    title: z.string(),
    image: z.string().nullable(),
    year: z.string(),
    type: z.enum(["movie", "series", "anime", "manga", "game"]),
    overview: z.string(),
    rating: z.number().nullable(),
  }),
);
