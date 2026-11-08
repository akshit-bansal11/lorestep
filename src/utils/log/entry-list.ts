import type { Entry } from "@/types/log/entry";
import type { LibraryFilters, LocalPatch, SortKey } from "@/types/log/library";

/** Nulls sort last in both directions, so an unrated title never tops "Rating". */
function byNumber(a: number | null, b: number | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return b - a;
}

function byUpdated(a: Entry, b: Entry): number {
  if (a.updatedAt === b.updatedAt) return 0;
  return a.updatedAt < b.updatedAt ? 1 : -1;
}

/** A sorted copy. Year and rating run high to low; title runs A to Z; updated is newest first. */
export function sortEntries(entries: readonly Entry[], key: SortKey): Entry[] {
  const copy = [...entries];
  switch (key) {
    case "title":
      return copy.sort((a, b) => a.title.localeCompare(b.title));
    case "year":
      return copy.sort((a, b) => byNumber(a.year, b.year));
    case "rating":
      return copy.sort((a, b) => byNumber(a.rating, b.rating));
    case "updated":
      return copy.sort(byUpdated);
  }
}

/** Whether a freshly saved entry belongs in the list the filters describe. */
export function matchesFilters(entry: Entry, filters: LibraryFilters): boolean {
  if (entry.kind !== filters.kind) return false;
  if (filters.status !== "" && entry.status !== filters.status) return false;
  return filters.q === "" || entry.title.toLowerCase().includes(filters.q.toLowerCase());
}

export function insertEntry(entries: readonly Entry[], entry: Entry): Entry[] {
  return [entry, ...entries.filter((item) => item.id !== entry.id)];
}

export function removeEntry(entries: readonly Entry[], id: string): Entry[] {
  return entries.filter((item) => item.id !== id);
}

/** Swap in the server's copy (or the rollback copy) of one entry, keeping its place. */
export function replaceEntry(entries: readonly Entry[], entry: Entry): Entry[] {
  return entries.map((item) => (item.id === entry.id ? entry : item));
}

/** The optimistic result of a patch, shown before the server answers. */
export function applyLocalPatch(entry: Entry, patch: LocalPatch): Entry {
  return { ...entry, ...patch };
}
