import {
  CANONICAL_TO_EXTENSION,
  CANONICAL_TO_LIBRARY,
  EXTENSION_TO_CANONICAL,
  LIBRARY_TO_CANONICAL,
  PLOTLINE_TO_CANONICAL,
  PLOTLINE_VERBS,
} from "@/constants/log/statuses";
import type {
  CanonicalState,
  CanonicalStatus,
  EntryKind,
  ExtensionStatus,
  LibraryStatus,
  PlotlineState,
  PlotlineStatus,
} from "@/types/log/status";

/** Library id -> stored `(status, shelf)` (PLAN.md section 3). */
export function toCanonical(status: LibraryStatus): CanonicalState {
  return LIBRARY_TO_CANONICAL[status];
}

/**
 * Stored `(status, shelf)` -> library id, in the section 3 order: trash, wishlist, own (planned is
 * backlogged, no status is own), then by status. `null` when nothing is set.
 */
export function toLibraryStatus({ status, shelf }: CanonicalState): LibraryStatus | null {
  if (shelf === "trash") return "trash";
  if (shelf === "wishlist") return "wishlist";
  if (shelf === "own" && status === "planned") return "backlogged";
  if (shelf === "own" && status === null) return "own";
  return status === null ? null : CANONICAL_TO_LIBRARY[status];
}

export function fromExtension(status: ExtensionStatus): CanonicalStatus {
  return EXTENSION_TO_CANONICAL[status];
}

export function toExtension(status: CanonicalStatus): ExtensionStatus {
  return CANONICAL_TO_EXTENSION[status];
}

/** Plotline id -> stored state. A shelf only exists on games, so it is dropped for other kinds. */
export function fromPlotline(status: PlotlineStatus, kind: EntryKind): PlotlineState {
  const state = PLOTLINE_TO_CANONICAL[status];
  return kind === "game" ? state : { ...state, shelf: null };
}

/** Canonical status -> the Plotline id for that kind. */
export function toPlotline(status: CanonicalStatus, kind: EntryKind): PlotlineStatus {
  return status === "in_progress" || status === "planned" ? PLOTLINE_VERBS[kind][status] : status;
}
