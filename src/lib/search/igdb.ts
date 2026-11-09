import { safeFetchJson } from "@/lib/http/safe-fetch";
import { coverUrl, igdbRating, igdbText } from "@/lib/metadata/igdb";
import { getIgdbAccess, igdbHeaders } from "@/lib/providers/igdb-auth";
import type { ProviderSearch, SearchResult } from "@/types/metadata/metadata";

export interface IgdbSearchItem {
  id: number;
  name?: string;
  cover?: { url?: string };
  first_release_date?: number;
  summary?: string;
  aggregated_rating?: number;
  total_rating?: number;
  rating?: number;
}

/** Pure: IGDB games into results. */
export function mapIgdbSearch(items: IgdbSearchItem[]): SearchResult[] {
  return items.map((item) => ({
    id: String(item.id),
    title: item.name || "",
    image: coverUrl(item.cover?.url),
    year:
      typeof item.first_release_date === "number"
        ? String(new Date(item.first_release_date * 1000).getUTCFullYear())
        : "",
    type: "game",
    overview: item.summary || "",
    rating: igdbRating(item.aggregated_rating ?? item.total_rating ?? item.rating),
  }));
}

export async function searchIgdb(query: string): Promise<ProviderSearch> {
  const access = await getIgdbAccess();
  if (access === null) return { results: [], error: "Game search is not configured." };

  const res = await safeFetchJson<IgdbSearchItem[]>("https://api.igdb.com/v4/games", {
    method: "POST",
    headers: igdbHeaders(access),
    body: `search "${igdbText(query)}"; fields id,name,cover.url,first_release_date,summary,aggregated_rating,total_rating,rating; limit 20;`,
  });
  if (!res.ok || !Array.isArray(res.data)) {
    return { results: [], error: "Game search is unavailable." };
  }
  return { results: mapIgdbSearch(res.data), error: "" };
}
