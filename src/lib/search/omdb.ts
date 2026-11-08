import { SEARCH_PER_PROVIDER } from "@/constants/metadata/metadata";
import { safeFetchJson } from "@/lib/http/safe-fetch";
import { yearOf } from "@/lib/providers/format";
import { omdbUrl } from "@/lib/providers/omdb-request";
import type { ProviderSearch, SearchResult } from "@/types/metadata/metadata";

export interface OmdbSearchItem {
  imdbID: string;
  Title: string;
  Poster: string;
  Year: string;
  Type: string;
}

/**
 * Pure: OMDb search items into results. The search call carries no rating or plot (that is one
 * extra request per hit), so those stay empty and the TMDB side fills them when titles match.
 */
export function mapOmdbSearch(items: OmdbSearchItem[]): SearchResult[] {
  return items
    .filter((item) => item.Type === "movie" || item.Type === "series")
    .slice(0, SEARCH_PER_PROVIDER)
    .map((item) => ({
      id: item.imdbID,
      title: item.Title,
      image: item.Poster !== "N/A" ? item.Poster : null,
      year: yearOf(item.Year) ?? "",
      type: item.Type === "series" ? "series" : "movie",
      overview: "",
      rating: null,
    }));
}

export async function searchOmdb(
  query: string,
  type?: "movie" | "series",
): Promise<ProviderSearch> {
  const url = omdbUrl({ s: query, ...(type ? { type } : {}) });
  if (url === null) return { results: [], error: "Movie and series search is not configured." };
  const res = await safeFetchJson<{ Response?: string; Search?: OmdbSearchItem[] }>(url);
  if (!res.ok) return { results: [], error: "Movie and series search is unavailable." };
  if (res.data.Response === "False") return { results: [], error: "" };
  return { results: mapOmdbSearch(res.data.Search ?? []), error: "" };
}
