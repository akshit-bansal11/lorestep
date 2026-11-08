import { LIBRARY_COPY } from "@/constants/log/copy";
import { RATING_MAX, RATING_MIN } from "@/constants/log/entries";
import { PROGRESS_FIELDS } from "@/constants/log/library";
import { CANONICAL_STATUSES, SHELVES } from "@/constants/log/statuses";
import type { Entry, Progress } from "@/types/log/entry";
import type { EntryPatchInput } from "@/types/log/entry-input";
import type { DraftErrors, EntryDraft } from "@/types/log/library";
import { isMediaKind } from "@/utils/log/media-kind";
import { pick } from "@/utils/log/pick";

const COUNT_MAX = 100_000;
const { errors } = LIBRARY_COPY.editor;

const text = (value: number | undefined) => (value === undefined ? "" : String(value));

export function draftFromEntry(entry: Entry): EntryDraft {
  return {
    status: entry.status ?? "",
    shelf: entry.shelf ?? "",
    rating: entry.rating === null ? "" : String(entry.rating),
    notes: entry.notes,
    device: entry.device ?? "",
    storefront: entry.storefront ?? "",
    seasons: text(entry.progress.seasons),
    episodes: text(entry.progress.episodes),
    chapters: text(entry.progress.chapters),
    volumes: text(entry.progress.volumes),
    playMinutes: text(entry.progress.playMinutes),
  };
}

function isWhole(value: string, min: number, max: number): boolean {
  if (!/^\d+$/.test(value.trim())) return false;
  const number = Number(value);
  return number >= min && number <= max;
}

/** Field errors by name, empty when the draft can be sent. Empty fields are valid (cleared). */
export function validateDraft(entry: Entry, draft: EntryDraft): DraftErrors {
  const found: DraftErrors = {};
  if (draft.rating.trim() !== "" && !isWhole(draft.rating, RATING_MIN, RATING_MAX)) {
    found.rating = errors.rating;
  }
  if (!isMediaKind(entry.kind)) return found;
  for (const field of PROGRESS_FIELDS[entry.kind]) {
    const value = draft[field.key];
    if (value.trim() !== "" && !isWhole(value, 0, COUNT_MAX)) {
      found[field.key] = errors.count.replace("{label}", field.label);
    }
  }
  return found;
}

function progressFromDraft(entry: Entry, draft: EntryDraft): Progress {
  if (!isMediaKind(entry.kind)) return entry.progress;
  const next: Progress = { ...entry.progress };
  for (const field of PROGRESS_FIELDS[entry.kind]) {
    const value = draft[field.key].trim();
    if (value === "") delete next[field.key];
    else next[field.key] = Number(value);
  }
  return next;
}

function sameProgress(a: Progress, b: Progress): boolean {
  return (["seasons", "episodes", "chapters", "volumes", "playMinutes"] as const).every(
    (key) => a[key] === b[key],
  );
}

/** Only the fields the user changed, in the shape of PATCH /api/v1/entries/:id. */
export function patchFromDraft(entry: Entry, draft: EntryDraft): EntryPatchInput {
  const patch: EntryPatchInput = {};
  const status = pick(CANONICAL_STATUSES, draft.status);
  if (status !== entry.status) patch.status = status;
  const shelf = pick(SHELVES, draft.shelf);
  if (shelf !== entry.shelf) patch.shelf = shelf;
  const device = draft.device === "" ? null : draft.device;
  if (device !== entry.device) patch.device = device;
  const storefront = draft.storefront === "" ? null : draft.storefront;
  if (storefront !== entry.storefront) patch.storefront = storefront;
  const rating = draft.rating.trim() === "" ? null : Number(draft.rating);
  if (rating !== entry.rating) patch.rating = rating;
  if (draft.notes !== entry.notes) patch.notes = draft.notes;
  const progress = progressFromDraft(entry, draft);
  if (!sameProgress(progress, entry.progress)) patch.progress = progress;
  return patch;
}
