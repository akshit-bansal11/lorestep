import { ENRICH_FETCH_RETRIES } from "@/constants/metadata/enrich";
import { safeFetchJson } from "@/lib/http/safe-fetch";
import { createTtlCache } from "@/lib/metadata/cache";
import { LookupError } from "@/lib/metadata/lookup-error";
import { tmdbRequest } from "@/lib/providers/tmdb-request";
import { tmdbHit } from "@/mappers/metadata/enrich-hit-mapper";
import type { EnrichHit, TmdbMatchItem } from "@/types/metadata/enrich";
import { normTitle } from "@/utils/log/norm-title";
import { pickUniqueHit } from "@/utils/metadata/pick-unique-hit";

const cache = createTtlCache<EnrichHit | null>();

/** True when a TMDB token or key is set. */
export const tmdbConfigured = () => tmdbRequest("/") !== null;

/**
 * The one TMDB search result whose normalised title is exactly `titleNorm` (and whose year is
 * `year`, when the entry has one): never a guess. Null on no match, an ambiguous match or no key.
 * Throws `LookupError` when TMDB fails; the request is not retried.
 */
export async function matchTmdb(
  title: string,
  titleNorm: string,
  year: number | null,
  kind: "movie" | "tv",
): Promise<EnrichHit | null> {
  const key = `${kind}|${titleNorm}|${year ?? ""}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  const request = tmdbRequest(`/search/${kind}`, { query: title, include_adult: "false" });
  if (request === null || titleNorm === "") return null;
  const res = await safeFetchJson<{ results?: TmdbMatchItem[] }>(
    request.url,
    request.init,
    ENRICH_FETCH_RETRIES,
  );
  if (!res.ok) throw new LookupError(res.status);

  const exact = (res.data.results ?? []).filter(
    (item) => normTitle(item.title || item.name || "") === titleNorm,
  );
  const hit = pickUniqueHit(exact.map(tmdbHit), year);
  cache.set(key, hit);
  return hit;
}
