import type { z } from "zod";

import type { entries } from "@/lib/db/schema";
import type { ENTRY_COLUMNS } from "@/mappers/log/entry-mapper";
import type {
  entryCreateSchema,
  entryListQuerySchema,
  entryPatchSchema,
  gameEntrySchema,
  progressSchema,
} from "@/schemas/log/entry";

export type Progress = z.infer<typeof progressSchema>;
export type EntryCreate = z.infer<typeof entryCreateSchema>;
export type EntryPatch = z.infer<typeof entryPatchSchema>;
export type EntryListQuery = z.infer<typeof entryListQuerySchema>;
export type GameEntryInput = z.infer<typeof gameEntrySchema>;

/** One row as the service selects it (explicit columns, DB-21). */
export type EntryRow = Pick<typeof entries.$inferSelect, keyof typeof ENTRY_COLUMNS>;

/** Entry JSON (PLAN.md section 5). */
export interface Entry {
  id: string;
  kind: string;
  title: string;
  year: number | null;
  status: string | null;
  shelf: string | null;
  rating: number | null;
  notes: string;
  progress: Progress;
  repeatCount: number;
  device: string | null;
  storefront: string | null;
  gameId: string | null;
  ext: { source: string; id: string } | null;
  imageUrl: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EntryPage {
  items: Entry[];
  nextCursor: string | null;
}

export interface EntryCursor {
  /** `updated_at::text`, microsecond-exact, so keyset paging never skips or repeats a row. */
  at: string;
  id: string;
}

/** Second argument of the `/api/v1/entries/[id]` handlers. */
export interface EntryRouteContext {
  params: Promise<{ id: string }>;
}

/** Second argument of the `/api/v1/entries/game/[gameId]` handler. */
export interface GameEntryRouteContext {
  params: Promise<{ gameId: string }>;
}
