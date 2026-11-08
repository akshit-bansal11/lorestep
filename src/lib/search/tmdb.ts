import { SEARCH_PER_PROVIDER, TMDB_IMAGE_BASE } from "@/constants/metadata/metadata";
import { safeFetchJson } from "@/lib/http/safe-fetch";
import { round1, yearOf } from "@/lib/providers/format";
import { tmdbRequest } from "@/lib/providers/tmdb-request";
import type { ProviderSearch, SearchResult } from "@/types/metadata/metadata";

export interface TmdbSearchItem {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  media_type?: string;
  overview?: string;
  vote_average?: number;
}

/** Pure: TMDB multi-search items into results, keeping movies and TV only. */
export function mapTmdbSearch(items: TmdbSearchItem[]): SearchResult[] {
  return items
    .filter((item) => item.media_type === "movie" || item.media_type === "tv")
    .slice(0, SEARCH_PER_PROVIDER)
    .map((item) => ({
      id: String(item.id),
      title: item.title || item.name || "",
      image: item.poster_path ? `${TMDB_IMAGE_BASE}${item.poster_path}` : null,
      year: yearOf(item.release_date || item.first_air_date) ?? "",
      type: item.media_type === "tv" ? "series" : "movie",
      overview: item.overview || "",
      rating: typeof item.vote_average === "number" ? round1(item.vote_average) : null,
    }));
}

export async function searchTmdb(query: string): Promise<ProviderSearch> {
  const request = tmdbRequest("/search/multi", { query, include_adult: "false" });
  if (request === null) {
    return { results: [], error: "Movie and series search is not configured." };
  }
  const res = await safeFetchJson<{ results?: TmdbSearchItem[] }>(request.url, request.init);
  if (!res.ok) return { results: [], error: "Movie and series search is unavailable." };
  return { results: mapTmdbSearch(res.data.results ?? []), error: "" };
}
