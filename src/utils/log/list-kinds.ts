import { KIND_NAMES } from "@/constants/log/copy";
import { LISTS_COPY } from "@/constants/log/lists-copy";
import { isMediaKind } from "@/utils/log/media-kind";

/** "movies, anime" for a card, or "Any type" when the list is not limited to kinds. */
export function kindsLabel(kinds: readonly string[]): string {
  const names = kinds.filter(isMediaKind).map((kind) => KIND_NAMES[kind]);
  return names.length === 0 ? LISTS_COPY.noKinds : names.join(", ");
}

export function countLabel(count: number): string {
  return count === 1 ? LISTS_COPY.count.one : LISTS_COPY.count.other.replace("{n}", String(count));
}
