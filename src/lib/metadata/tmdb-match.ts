import { safeFetchJson } from "@/lib/http/safe-fetch";
import { createTtlCache } from "@/lib/metadata/cache";
import { tmdbRequest } from "@/lib/providers/tmdb-request";
import { tmdbHit } from "@/mappers/metadata/enrich-hit-mapper";
import type { EnrichHit, TmdbMatchItem } from "@/types/metadata/enrich";
import { normTitle } from "@/utils/log/norm-title";

const cache = createTtlCache<EnrichHit | null>();

/** True when a TMDB token or key is set. */
export const tmdbConfigured = () => tmdbRequest("/") !== null;

/**
 * TMDB's top search result, only when its normalised title is exactly `titleNorm`: never a guess.
 * Null on no match or no key; throws when TMDB fails, so the caller can retry the entry later.
 */
export async function matchTmdb(
  title: string,
  titleNorm: string,
  kind: "movie" | "tv",
): Promise<EnrichHit | null> {
  const key = `${kind}|${titleNorm}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  const request = tmdbRequest(`/search/${kind}`, { query: title, include_adult: "false" });
  if (request === null || titleNorm === "") return null;
  const res = await safeFetchJson<{ results?: TmdbMatchItem[] }>(request.url, request.init);
  if (!res.ok) throw new Error(res.error);

  const top = res.data.results?.[0];
  const hit =
    top !== undefined && normTitle(top.title || top.name || "") === titleNorm ? tmdbHit(top) : null;
  cache.set(key, hit);
  return hit;
}
