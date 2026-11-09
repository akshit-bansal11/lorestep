import { createTtlCache } from "@/lib/metadata/cache";
import { fetchIgdbMetadata } from "@/lib/metadata/igdb";
import { fetchMalMetadata } from "@/lib/metadata/mal";
import { mergeMetadata } from "@/lib/metadata/merge";
import { fetchOmdbMetadata } from "@/lib/metadata/omdb";
import { fetchTmdbMetadata } from "@/lib/metadata/tmdb";
import type { MetadataParams } from "@/schemas/log/metadata";
import type { MetadataResult } from "@/types/metadata/metadata";

const cache = createTtlCache<MetadataResult>();

async function fetchMetadata({
  type,
  id,
  title,
  year,
}: MetadataParams): Promise<MetadataResult | null> {
  if (type === "movie" || type === "series") {
    const [tmdb, omdb] = await Promise.all([
      fetchTmdbMetadata(id ?? null, title ?? null, type, year),
      fetchOmdbMetadata(id ?? null, title ?? null, type, year),
    ]);
    return mergeMetadata(tmdb, omdb);
  }
  if (type === "game") return fetchIgdbMetadata(id ?? null, title ?? null);
  return id === undefined ? null : fetchMalMetadata(id, type);
}

/** Enriched metadata for one title, merged across providers; `data` is null when none knows it. */
export async function getMetadata(
  params: MetadataParams,
): Promise<{ data: MetadataResult | null; cached: boolean }> {
  const key = [params.type, params.id, params.title, params.year].join("|");
  const hit = cache.get(key);
  if (hit !== undefined) return { data: hit, cached: true };

  const data = await fetchMetadata(params);
  if (data !== null) cache.set(key, data);
  return { data, cached: false };
}
