import type {
  CanonicalState,
  CanonicalStatus,
  DogearStatus,
  EntryKind,
  LibraryStatus,
  PlotlineState,
  PlotlineStatus,
} from "@/types/log/status";

/** Mirrors the `entries_status_check` and `entries_shelf_check` constraints. */
export const CANONICAL_STATUSES = [
  "planned",
  "in_progress",
  "completed",
  "on_hold",
  "dropped",
] as const;
export const SHELVES = ["own", "wishlist", "trash"] as const;

/** `STATUSES` (constants/canon/statuses.ts) plus `planned` and `on_hold`. */
export const LIBRARY_STATUSES = [
  "playing",
  "completed",
  "own",
  "backlogged",
  "wishlist",
  "dropped",
  "trash",
  "planned",
  "on_hold",
] as const;

export const DOGEAR_STATUSES = ["watching", "plan", "hold", "completed", "dropped"] as const;

export const PLOTLINE_STATUSES = [
  "watching",
  "reading",
  "playing",
  "rewatching",
  "rereading",
  "replaying",
  "plan_to_watch",
  "plan_to_read",
  "plan_to_play",
  "completed",
  "fully_completed",
  "on_hold",
  "dropped",
  "backlogged",
  // Plotline's legacy ids (`normalizeEntryStatus`), read once at import.
  "main_story_completed",
  "not_committed",
  "committed",
  "bored",
  "own",
  "wishlist",
] as const;

/** PLAN.md section 3, read right to left. */
export const LIBRARY_TO_CANONICAL: Record<LibraryStatus, CanonicalState> = {
  playing: { status: "in_progress", shelf: null },
  planned: { status: "planned", shelf: null },
  completed: { status: "completed", shelf: null },
  on_hold: { status: "on_hold", shelf: null },
  dropped: { status: "dropped", shelf: null },
  backlogged: { status: "planned", shelf: "own" },
  wishlist: { status: "planned", shelf: "wishlist" },
  own: { status: null, shelf: "own" },
  trash: { status: "dropped", shelf: "trash" },
};

/** The library id of a canonical status with no shelf. */
export const CANONICAL_TO_LIBRARY: Record<CanonicalStatus, LibraryStatus> = {
  planned: "planned",
  in_progress: "playing",
  completed: "completed",
  on_hold: "on_hold",
  dropped: "dropped",
};

/** Dogear keeps its own ids and maps at the sync boundary only. */
export const DOGEAR_TO_CANONICAL: Record<DogearStatus, CanonicalStatus> = {
  watching: "in_progress",
  plan: "planned",
  hold: "on_hold",
  completed: "completed",
  dropped: "dropped",
};

export const CANONICAL_TO_DOGEAR: Record<CanonicalStatus, DogearStatus> = {
  in_progress: "watching",
  planned: "plan",
  on_hold: "hold",
  completed: "completed",
  dropped: "dropped",
};

const IN_PROGRESS: PlotlineState = { status: "in_progress", shelf: null, repeat: false };
const REPEAT: PlotlineState = { status: "in_progress", shelf: null, repeat: true };
const PLANNED: PlotlineState = { status: "planned", shelf: null, repeat: false };
const COMPLETED: PlotlineState = { status: "completed", shelf: null, repeat: false };
const DROPPED: PlotlineState = { status: "dropped", shelf: null, repeat: false };

export const PLOTLINE_TO_CANONICAL: Record<PlotlineStatus, PlotlineState> = {
  watching: IN_PROGRESS,
  reading: IN_PROGRESS,
  playing: IN_PROGRESS,
  not_committed: IN_PROGRESS,
  committed: IN_PROGRESS,
  rewatching: REPEAT,
  rereading: REPEAT,
  replaying: REPEAT,
  plan_to_watch: PLANNED,
  plan_to_read: PLANNED,
  plan_to_play: PLANNED,
  completed: COMPLETED,
  fully_completed: COMPLETED,
  main_story_completed: COMPLETED,
  on_hold: { status: "on_hold", shelf: null, repeat: false },
  dropped: DROPPED,
  bored: DROPPED,
  backlogged: { status: "planned", shelf: "own", repeat: false },
  wishlist: { status: "planned", shelf: "wishlist", repeat: false },
  own: { status: null, shelf: "own", repeat: false },
};

/** Plotline's per-kind verbs for the two statuses whose label depends on the kind. */
export const PLOTLINE_VERBS: Record<
  EntryKind,
  { in_progress: PlotlineStatus; planned: PlotlineStatus }
> = {
  movie: { in_progress: "watching", planned: "plan_to_watch" },
  series: { in_progress: "watching", planned: "plan_to_watch" },
  anime: { in_progress: "watching", planned: "plan_to_watch" },
  manga: { in_progress: "reading", planned: "plan_to_read" },
  game: { in_progress: "playing", planned: "plan_to_play" },
};
