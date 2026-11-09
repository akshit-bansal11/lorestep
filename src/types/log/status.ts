import type {
  CANONICAL_STATUSES,
  EXTENSION_STATUSES,
  LIBRARY_STATUSES,
  PLOTLINE_STATUSES,
  SHELVES,
} from "@/constants/log/statuses";
import type { MEDIA_KINDS } from "@/constants/metadata/metadata";

export type EntryKind = (typeof MEDIA_KINDS)[number];

/** The stored status vocabulary (PLAN.md section 3). */
export type CanonicalStatus = (typeof CANONICAL_STATUSES)[number];

/** Game-only shelf, orthogonal to status. */
export type Shelf = (typeof SHELVES)[number];

/** Lorestep's 7 game-table ids plus the two that only the new library and the extension create. */
export type LibraryStatus = (typeof LIBRARY_STATUSES)[number];

export type ExtensionStatus = (typeof EXTENSION_STATUSES)[number];

export type PlotlineStatus = (typeof PLOTLINE_STATUSES)[number];

export interface CanonicalState {
  status: CanonicalStatus | null;
  shelf: Shelf | null;
}

/** Plotline's re-watch / re-read / re-play ids are `in_progress` with `repeat`. */
export interface PlotlineState extends CanonicalState {
  repeat: boolean;
}
