import { ENTRY_LIMITS } from "@/constants/log/entries";
import type { EntryCreateInput } from "@/types/log/entry-input";
import type { MetadataResponse } from "@/types/log/metadata-response";
import type { SearchResult } from "@/types/metadata/metadata";

/** The provider that issued a search result's id: MAL for anime and manga, IGDB for games, else TMDB or OMDb. */
function sourceOf(result: SearchResult): "tmdb" | "omdb" | "mal" | "igdb" {
  if (result.type === "anime" || result.type === "manga") return "mal";
  if (result.type === "game") return "igdb";
  return result.id.startsWith("tt") ? "omdb" : "tmdb";
}

function yearOf(value: string | undefined): number | null {
  return value !== undefined && /^\d{4}$/.test(value) ? Number(value) : null;
}

/** A new entry from a search pick, filled with whatever the metadata call found. */
export function entryFromResult(
  result: SearchResult,
  metadata: MetadataResponse | null,
): EntryCreateInput {
  const found = metadata?.data;
  const image = found?.image ?? result.image;
  return {
    kind: result.type,
    title: (found?.title ?? result.title).slice(0, ENTRY_LIMITS.title),
    year: yearOf(found?.year) ?? yearOf(result.year),
    ext: { source: sourceOf(result), id: result.id.slice(0, ENTRY_LIMITS.extId) },
    imageUrl:
      image?.startsWith("https://") === true && image.length <= ENTRY_LIMITS.imageUrl
        ? image
        : null,
  };
}
