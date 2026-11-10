import { MAL_MATCH_LIMIT, MAL_QUERY_MAX, MAL_QUERY_MIN } from "@/constants/metadata/enrich";
import { safeFetchJson } from "@/lib/http/safe-fetch";
import { createTtlCache } from "@/lib/metadata/cache";
import { malHit, malTitles } from "@/mappers/metadata/enrich-hit-mapper";
import type { EnrichHit, MalMatchItem } from "@/types/metadata/enrich";
import { normTitle } from "@/utils/log/norm-title";

const cache = createTtlCache<EnrichHit | null>();

/**
 * The first MyAnimeList anime whose main, English or alternative title normalises exactly to
 * `titleNorm`. Null on no match, no `MAL_CLIENT_ID` or a title MAL cannot search; throws when MAL
 * fails, so the caller can retry the entry later.
 */
export async function matchMal(title: string, titleNorm: string): Promise<EnrichHit | null> {
  const clientId = process.env.MAL_CLIENT_ID;
  if (!clientId || titleNorm === "" || title.length < MAL_QUERY_MIN) return null;
  const cached = cache.get(titleNorm);
  if (cached !== undefined) return cached;

  const params = new URLSearchParams({
    q: title.slice(0, MAL_QUERY_MAX),
    limit: String(MAL_MATCH_LIMIT),
    fields: "alternative_titles,main_picture,start_date",
  });
  const res = await safeFetchJson<{ data?: MalMatchItem[] }>(
    `https://api.myanimelist.net/v2/anime?${params}`,
    { headers: { "X-MAL-CLIENT-ID": clientId } },
  );
  if (!res.ok) throw new Error(res.error);

  const item = (res.data.data ?? []).find((result) =>
    malTitles(result).some((name) => normTitle(name) === titleNorm),
  );
  const hit = item === undefined ? null : malHit(item);
  cache.set(titleNorm, hit);
  return hit;
}
