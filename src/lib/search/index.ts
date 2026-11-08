import { SEARCH_MAX_RESULTS } from "@/constants/metadata/metadata";
import { createTtlCache } from "@/lib/metadata/cache";
import { searchIgdb } from "@/lib/search/igdb";
import { searchMal } from "@/lib/search/mal";
import { mergeMovieSeries } from "@/lib/search/merge";
import { searchOmdb } from "@/lib/search/omdb";
import { searchTmdb } from "@/lib/search/tmdb";
import type { SearchParams } from "@/schemas/log/search";
import type { ProviderSearch, SearchResult } from "@/types/metadata/metadata";

export interface SearchOutcome {
  results: SearchResult[];
  /** User-safe provider failures; results can be non-empty alongside them. */
  errors: string[];
}

const cache = createTtlCache<SearchOutcome>();

const NONE: ProviderSearch = { results: [], error: "" };

async function runSearch({ q, type }: SearchParams): Promise<SearchOutcome> {
  const wants = (kind: SearchResult["type"]) => type === undefined || type === kind;
  const screen = type === undefined || type === "movie" || type === "series";

  const [tmdb, omdb, anime, manga, games] = await Promise.all([
    screen ? searchTmdb(q) : NONE,
    screen ? searchOmdb(q, type === "movie" || type === "series" ? type : undefined) : NONE,
    wants("anime") ? searchMal(q, "anime") : NONE,
    wants("manga") ? searchMal(q, "manga") : NONE,
    wants("game") ? searchIgdb(q) : NONE,
  ]);

  const screenResults = mergeMovieSeries(
    tmdb.results.filter((item) => wants(item.type)),
    omdb.results.filter((item) => wants(item.type)),
  );
  const errors = [...new Set([tmdb, omdb, anime, manga, games].map((r) => r.error))].filter(
    Boolean,
  );

  return {
    results: [...screenResults, ...anime.results, ...manga.results, ...games.results].slice(
      0,
      SEARCH_MAX_RESULTS,
    ),
    errors,
  };
}

/** Search every provider the type allows, merged and capped at SEARCH_MAX_RESULTS. */
export async function searchMedia(params: SearchParams): Promise<SearchOutcome> {
  const key = `${params.type ?? ""}|${params.q.toLowerCase()}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;

  const outcome = await runSearch(params);
  if (outcome.errors.length === 0) cache.set(key, outcome);
  return outcome;
}
