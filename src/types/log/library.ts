import type { EntryPatchInput } from "@/types/log/entry-input";
import type { CanonicalStatus } from "@/types/log/status";
import type { MediaKind } from "@/types/metadata/metadata";

export type SortKey = "updated" | "title" | "year" | "rating";

export interface LibraryFilters {
  kind: MediaKind;
  /** "" is every status. */
  status: CanonicalStatus | "";
  /** Applied (debounced) search text, "" for none. */
  q: string;
}

/** The editor's form state: every field a string so a half-typed number survives. */
export interface EntryDraft {
  status: string;
  shelf: string;
  rating: string;
  notes: string;
  device: string;
  storefront: string;
  seasons: string;
  episodes: string;
  chapters: string;
  volumes: string;
  playMinutes: string;
}

export type DraftField = keyof EntryDraft;
export type DraftErrors = Partial<Record<DraftField, string>>;

/** The patch fields the editor can change; the rest of an entry is read-only here. */
export type LocalPatch = Pick<
  EntryPatchInput,
  "status" | "shelf" | "rating" | "notes" | "progress" | "device" | "storefront"
>;

/** The one status line under the toolbar: a result, an error, or a delete with its undo. */
export interface Notice {
  text: string;
  onUndo?: () => void;
}
