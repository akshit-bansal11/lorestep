import type { SearchResult } from "@/types/metadata/metadata";

const keyOf = (item: SearchResult) =>
  `${item.type}|${item.year}|${item.title.toLowerCase().replace(/\s+/g, " ").trim()}`;

/**
 * Merge TMDB and OMDb hits for movies and series. One title shows once: the TMDB entry wins and
 * takes the OMDb poster or rating only where it has none of its own.
 */
export function mergeMovieSeries(
  primary: SearchResult[],
  secondary: SearchResult[],
): SearchResult[] {
  const seen = new Map<string, SearchResult>();
  for (const item of primary) seen.set(keyOf(item), item);
  for (const item of secondary) {
    const existing = seen.get(keyOf(item));
    seen.set(
      keyOf(item),
      existing === undefined
        ? item
        : {
            ...existing,
            image: existing.image ?? item.image,
            rating: existing.rating ?? item.rating,
            overview: existing.overview || item.overview,
          },
    );
  }
  return [...seen.values()];
}
