import type { SortKey } from "@/types/log/library";
import type { MediaKind } from "@/types/metadata/metadata";

export const KIND_TABS: readonly { id: MediaKind; label: string }[] = [
  { id: "movie", label: "Movies" },
  { id: "series", label: "Series" },
  { id: "anime", label: "Anime" },
  { id: "manga", label: "Manga" },
  { id: "game", label: "Games" },
];

export const SORT_DEFAULT_LABEL = "Recently updated";

export const SORT_OPTIONS: readonly { id: SortKey; label: string }[] = [
  { id: "updated", label: SORT_DEFAULT_LABEL },
  { id: "title", label: "Title" },
  { id: "year", label: "Year" },
  { id: "rating", label: "Rating" },
];

/** "Recently updated" is the select's empty choice; these are the others. */
export const SORT_CHOICES = SORT_OPTIONS.filter((option) => option.id !== "updated");

/** The first-run tab. */
export const DEFAULT_KIND: MediaKind = "movie";

export const SEARCH_DEBOUNCE_MS = 300;
/** Longer than a toast: the undo has to survive a screen-reader announcement. */
export const UNDO_WINDOW_SEC = 15;

/** The statuses a non-game entry can hold, in menu order. Games add a shelf (see `SHELF_OPTIONS`). */
export const STATUS_ORDER = ["planned", "in_progress", "completed", "on_hold", "dropped"] as const;

export const SHELF_OPTIONS = [
  { id: "own", label: "Owned" },
  { id: "wishlist", label: "Wishlist" },
  { id: "trash", label: "Not interested" },
] as const;

/** The progress counters each kind tracks, in field order. */
export const PROGRESS_FIELDS: Record<
  MediaKind,
  readonly { key: "seasons" | "episodes" | "chapters" | "volumes" | "playMinutes"; label: string }[]
> = {
  movie: [],
  series: [
    { key: "seasons", label: "Season" },
    { key: "episodes", label: "Episode" },
  ],
  anime: [{ key: "episodes", label: "Episode" }],
  manga: [
    { key: "chapters", label: "Chapter" },
    { key: "volumes", label: "Volume" },
  ],
  game: [{ key: "playMinutes", label: "Play time (minutes)" }],
};

export const PAGE_SIZE = 50;
