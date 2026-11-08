import { ENTRY_LIMITS, EXT_SOURCES } from "@/constants/log/entries";
import type { Entry } from "@/types/log/entry";
import type { ListItem, ListItemCreate } from "@/types/log/list";
import { isMediaKind } from "@/utils/log/media-kind";
import { normTitle } from "@/utils/log/norm-title";

/** The entries whose title contains `term` (case, accents and punctuation ignored); all when empty. */
export function filterEntriesByTitle(entries: readonly Entry[], term: string): Entry[] {
  const wanted = normTitle(term);
  return wanted === ""
    ? [...entries]
    : entries.filter((entry) => normTitle(entry.title).includes(wanted));
}

/** Whether the list already holds this entry: same provider id, or same kind and title. */
export function isInList(entry: Entry, items: readonly ListItem[]): boolean {
  const title = normTitle(entry.title);
  return items.some((item) =>
    entry.ext !== null && item.ext !== null
      ? item.ext.source === entry.ext.source && item.ext.id === entry.ext.id
      : item.kind === entry.kind && normTitle(item.title) === title,
  );
}

/** A list item from a library entry; null for a kind the list API does not know. */
export function listItemFromEntry(entry: Entry): ListItemCreate | null {
  const kind = entry.kind;
  if (!isMediaKind(kind)) return null;
  const source = EXT_SOURCES.find((candidate) => candidate === entry.ext?.source);
  const image = entry.imageUrl;
  return {
    kind,
    title: entry.title,
    year: entry.year,
    ...(source !== undefined && entry.ext !== null
      ? { extSource: source, extId: entry.ext.id }
      : {}),
    ...(image?.startsWith("https://") === true && image.length <= ENTRY_LIMITS.imageUrl
      ? { imageUrl: image }
      : {}),
  };
}
