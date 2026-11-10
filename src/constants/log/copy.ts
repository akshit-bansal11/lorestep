import type { MediaKind } from "@/types/metadata/metadata";

/** Every string the library shows, so wording is reviewed in one place (UX-12). */
export const LIBRARY_COPY = {
  title: "Library",
  add: "Add title",
  searchLabel: "Search your library",
  searchPlaceholder: "Search by title",
  statusFilter: "Filter by status",
  allStatuses: "All statuses",
  sortLabel: "Sort by",
  viewGroup: "Layout",
  kindGroup: "Media type",
  tableCaption: "Your library",
  columns: {
    title: "Title",
    year: "Year",
    status: "Status",
    rating: "Rating",
    progress: "Progress",
    started: "Started",
    completed: "Completed",
    updated: "Last updated",
  },
  noValue: "–",
  notSet: "Not set",
  complete: "Complete",
  open: "Edit {title}",
  loading: "Loading your library…",
  loadMore: "Load more",
  loadingMore: "Loading more…",
  moreFailed: "Could not load more titles. {reason}",
  retry: "Retry",
  empty: {
    first: "Nothing here yet",
    firstBody: "Add the first {kind} you have watched, read or played, or want to.",
    firstAction: "Add title",
    filtered: "No matches",
    filteredBody: "Nothing in {kind} fits these filters.",
    filteredAction: "Clear filters",
  },
  error: { title: "Your library did not load", body: "{reason}" },
  offline: {
    banner:
      "You are offline. The list below is what loaded before; edits will not save until you reconnect.",
  },
  failure: {
    offline:
      "You are offline, or the connection dropped. Nothing was lost. Retry once you reconnect.",
    unauthorized: "Your session ended. Sign in again to keep editing.",
    rateLimited: "Too many requests. Try again in {wait}.",
    rateLimitedNoWait: "Too many requests. Try again in a minute.",
    generic: "The server answered {status}. Try again.",
  },
  editor: {
    title: "Edit {title}",
    status: "Status",
    noStatus: "No status",
    shelf: "Shelf",
    noShelf: "No shelf",
    rating: "Rating (1 to 10)",
    ratingHint: "Leave empty for no rating.",
    notes: "Notes",
    device: "Platform",
    noDevice: "No platform",
    storefront: "Storefront",
    noStorefront: "No storefront",
    progress: "Progress",
    save: "Save changes",
    saving: "Saving…",
    close: "Close",
    delete: "Delete",
    saved: "Saved {title}.",
    errors: {
      rating: "Rating must be a whole number from 1 to 10.",
      count: "{label} must be a whole number from 0 to 100000.",
    },
  },
  remove: {
    done: "Deleted {title}. Undo for {sec} seconds.",
    undo: "Undo",
    restored: "Restored {title}.",
    dismiss: "Dismiss",
  },
  addDialog: {
    title: "Add a title",
    searchLabel: "Title to search for",
    searchHint: "Searches movies, series, anime, manga and games.",
    typeLabel: "Type",
    anyType: "Any type",
    searching: "Searching…",
    none: "No results for {q}. Check the spelling or try another type.",
    pick: "Add {title}",
    prefilling: "Adding {title}…",
    partial: "Added {title}. Some details were not found; open it to fill them in.",
    added: "Added {title} to {kind}.",
    close: "Close",
    results: "Search results",
  },
} as const;

export const KIND_NAMES: Record<MediaKind, string> = {
  movie: "movies",
  series: "series",
  anime: "anime",
  manga: "manga",
  game: "games",
};

const BASE_STATUS_LABELS = {
  planned: "Planned",
  completed: "Completed",
  on_hold: "On hold",
  dropped: "Dropped",
} as const;

/** The status words that depend on the kind (Plotline verbs). */
export const STATUS_LABELS: Record<MediaKind, Record<string, string>> = {
  movie: { ...BASE_STATUS_LABELS, in_progress: "Watching" },
  series: { ...BASE_STATUS_LABELS, in_progress: "Watching" },
  anime: { ...BASE_STATUS_LABELS, in_progress: "Watching" },
  manga: { ...BASE_STATUS_LABELS, in_progress: "Reading" },
  game: { ...BASE_STATUS_LABELS, in_progress: "Playing" },
};
