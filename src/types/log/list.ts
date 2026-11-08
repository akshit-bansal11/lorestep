import type { z } from "zod";

import type { listCreateSchema, listItemSchema, listPatchSchema } from "@/schemas/log/list";

export type ListCreate = z.infer<typeof listCreateSchema>;
export type ListPatch = z.infer<typeof listPatchSchema>;
export type ListItemCreate = z.infer<typeof listItemSchema>;

/** List JSON (PLAN.md section 5). */
export interface List {
  id: string;
  name: string;
  description: string;
  kinds: string[];
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ListItem {
  id: string;
  kind: string;
  title: string;
  year: number | null;
  ext: { source: string; id: string } | null;
  imageUrl: string | null;
  sortOrder: number;
  addedAt: string;
}

export interface ListWithItems extends List {
  items: ListItem[];
}

/** Second argument of the `/api/v1/lists/[id]` and `/lists/[id]/items[/order]` handlers. */
export interface ListRouteContext {
  params: Promise<{ id: string }>;
}

/** Second argument of the `/api/v1/lists/[id]/items/[itemId]` handler. */
export interface ListItemRouteContext {
  params: Promise<{ id: string; itemId: string }>;
}
