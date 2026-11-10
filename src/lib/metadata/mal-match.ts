import {
  ENRICH_FETCH_RETRIES,
  MAL_MATCH_LIMIT,
  MAL_QUERY_MAX,
  MAL_QUERY_MIN,
} from "@/constants/metadata/enrich";
import { safeFetchJson } from "@/lib/http/safe-fetch";
import { createTtlCache } from "@/lib/metadata/cache";
import { LookupError } from "@/lib/metadata/lookup-error";
import { malHit, malTitles } from "@/mappers/metadata/enrich-hit-mapper";
import type { EnrichHit, MalMatchItem } from "@/types/metadata/enrich";
import { normTitle } from "@/utils/log/norm-title";
import { pickUniqueHit } from "@/utils/metadata/pick-unique-hit";

const cache = createTtlCache<EnrichHit | null>();

/**
 * The one MyAnimeList anime whose main, English or alternative title normalises exactly to
 * `titleNorm` (and whose year is `year`, when the entry has one). Null on no match, an ambiguous
 * match, no `MAL_CLIENT_ID` or a title MAL cannot search. Throws `LookupError` when MAL fails; the
 * request is not retried.
 */
export async function matchMal(
  title: string,
  titleNorm: string,
  year: number | null,
): Promise<EnrichHit | null> {
  const clientId = process.env.MAL_CLIENT_ID;
  if (!clientId || titleNorm === "" || title.length < MAL_QUERY_MIN) return null;
  const key = `${titleNorm}|${year ?? ""}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  const params = new URLSearchParams({
    q: title.slice(0, MAL_QUERY_MAX),
    limit: String(MAL_MATCH_LIMIT),
    fields: "alternative_titles,main_picture,start_date",
  });
  const res = await safeFetchJson<{ data?: MalMatchItem[] }>(
    `https://api.myanimelist.net/v2/anime?${params}`,
    { headers: { "X-MAL-CLIENT-ID": clientId } },
    ENRICH_FETCH_RETRIES,
  );
  if (!res.ok) throw new LookupError(res.status);

  const exact = (res.data.data ?? []).filter((result) =>
    malTitles(result).some((name) => normTitle(name) === titleNorm),
  );
  const hit = pickUniqueHit(exact.map(malHit), year);
  cache.set(key, hit);
  return hit;
}
