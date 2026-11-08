import { z } from "zod";

import type { List, ListItem, ListWithItems } from "@/types/log/list";

/** What the browser trusts about a list coming back from `/api/v1/lists` (client-side parse). */
export const listResponseSchema: z.ZodType<List> = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  kinds: z.array(z.string()),
  itemCount: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const listItemResponseSchema: z.ZodType<ListItem> = z.object({
  id: z.string(),
  kind: z.string(),
  title: z.string(),
  year: z.number().nullable(),
  ext: z.object({ source: z.string(), id: z.string() }).nullable(),
  imageUrl: z.string().nullable(),
  sortOrder: z.number(),
  addedAt: z.string(),
});

export const listWithItemsResponseSchema: z.ZodType<ListWithItems> = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  kinds: z.array(z.string()),
  itemCount: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  items: z.array(listItemResponseSchema),
});
