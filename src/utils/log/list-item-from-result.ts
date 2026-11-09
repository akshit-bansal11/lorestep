import { ENTRY_LIMITS } from "@/constants/log/entries";
import type { ListItemCreate } from "@/types/log/list";
import type { SearchResult } from "@/types/metadata/metadata";
import { sourceOf } from "@/utils/log/entry-from-result";

/** A list item from a search pick. Only what the search returned: no metadata call per add. */
export function listItemFromResult(result: SearchResult): ListItemCreate {
  const year = /^\d{4}$/.test(result.year) ? Number(result.year) : null;
  const image = result.image;
  return {
    kind: result.type,
    title: result.title.slice(0, ENTRY_LIMITS.title),
    year,
    extSource: sourceOf(result),
    extId: result.id.slice(0, ENTRY_LIMITS.extId),
    ...(image?.startsWith("https://") === true && image.length <= ENTRY_LIMITS.imageUrl
      ? { imageUrl: image }
      : {}),
  };
}
