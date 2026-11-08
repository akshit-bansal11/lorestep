import { SEARCH_PER_PROVIDER } from "@/constants/metadata/metadata";
import { safeFetchJson } from "@/lib/http/safe-fetch";
import { yearOf } from "@/lib/providers/format";
import type { ProviderSearch, SearchResult } from "@/types/metadata/metadata";

export interface MalSearchItem {
  node: {
    id: number;
    title: string;
    main_picture?: { medium?: string };
    start_date?: string;
    synopsis?: string;
    mean?: number;
  };
}

/** Pure: MAL search items into results of the given kind. */
export function mapMalSearch(items: MalSearchItem[], kind: "anime" | "manga"): SearchResult[] {
  return items.map(({ node }) => ({
    id: String(node.id),
    title: node.title,
    image: node.main_picture?.medium || null,
    year: yearOf(node.start_date) ?? "",
    type: kind,
    overview: node.synopsis || "",
    rating: node.mean ?? null,
  }));
}

export async function searchMal(query: string, kind: "anime" | "manga"): Promise<ProviderSearch> {
  const clientId = process.env.MAL_CLIENT_ID;
  if (!clientId) return { results: [], error: "Anime and manga search is not configured." };

  const params = new URLSearchParams({
    q: query,
    limit: String(SEARCH_PER_PROVIDER),
    fields: "title,main_picture,start_date,mean,synopsis",
  });
  const res = await safeFetchJson<{ data?: MalSearchItem[] }>(
    `https://api.myanimelist.net/v2/${kind}?${params}`,
    { headers: { "X-MAL-CLIENT-ID": clientId } },
  );
  if (!res.ok) return { results: [], error: "Anime and manga search is unavailable." };
  return { results: mapMalSearch(res.data.data ?? [], kind), error: "" };
}
