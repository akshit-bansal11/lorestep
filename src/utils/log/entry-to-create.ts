import { EXT_SOURCES } from "@/constants/log/entries";
import { CANONICAL_STATUSES, SHELVES } from "@/constants/log/statuses";
import type { Entry } from "@/types/log/entry";
import type { EntryCreateInput } from "@/types/log/entry-input";
import { isMediaKind } from "@/utils/log/media-kind";
import { pick } from "@/utils/log/pick";

/**
 * The body that recreates a deleted entry. The API has no restore, so undo posts the entry again
 * (a new id; the soft-deleted row no longer holds its unique keys). Null for an unknown kind.
 */
export function entryToCreate(entry: Entry): EntryCreateInput | null {
  if (!isMediaKind(entry.kind)) return null;
  const source = entry.ext === null ? null : pick(EXT_SOURCES, entry.ext.source);
  return {
    kind: entry.kind,
    title: entry.title,
    year: entry.year,
    status: pick(CANONICAL_STATUSES, entry.status ?? ""),
    shelf: pick(SHELVES, entry.shelf ?? ""),
    rating: entry.rating,
    notes: entry.notes,
    progress: entry.progress,
    repeatCount: entry.repeatCount,
    device: entry.device,
    storefront: entry.storefront,
    gameId: entry.gameId,
    ext: entry.ext !== null && source !== null ? { source, id: entry.ext.id } : null,
    imageUrl: entry.imageUrl,
    startedAt: entry.startedAt,
    completedAt: entry.completedAt,
  };
}
