import { entries } from "@/lib/db/schema";
import { progressSchema } from "@/schemas/log/entry";
import type { Entry, EntryRow } from "@/types/log/entry";

/** The columns every entry read selects (DB-21): never `user_id`, `title_norm` or `deleted_at`. */
export const ENTRY_COLUMNS = {
  id: entries.id,
  kind: entries.kind,
  title: entries.title,
  year: entries.year,
  status: entries.status,
  shelf: entries.shelf,
  rating: entries.rating,
  notes: entries.notes,
  progress: entries.progress,
  repeatCount: entries.repeatCount,
  device: entries.device,
  storefront: entries.storefront,
  gameId: entries.gameId,
  extSource: entries.extSource,
  extId: entries.extId,
  imageUrl: entries.imageUrl,
  startedAt: entries.startedAt,
  completedAt: entries.completedAt,
  createdAt: entries.createdAt,
  updatedAt: entries.updatedAt,
};

/** Row -> Entry JSON. A `progress` value that fails its schema reads as empty, never as a 500. */
export function toEntry(row: EntryRow): Entry {
  const progress = progressSchema.safeParse(row.progress);
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    year: row.year,
    status: row.status,
    shelf: row.shelf,
    rating: row.rating,
    notes: row.notes,
    progress: progress.success ? progress.data : {},
    repeatCount: row.repeatCount,
    device: row.device,
    storefront: row.storefront,
    gameId: row.gameId,
    ext:
      row.extSource !== null && row.extId !== null
        ? { source: row.extSource, id: row.extId }
        : null,
    imageUrl: row.imageUrl,
    startedAt: row.startedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
