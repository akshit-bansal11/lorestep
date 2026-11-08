export interface TmdbRequest {
  url: string;
  init: RequestInit;
}

/**
 * A TMDB v3 request. The read-access bearer token wins over the v3 key; with neither set the
 * provider is unconfigured and this returns null. `params` are encoded here, never by callers.
 */
export function tmdbRequest(path: string, params: Record<string, string> = {}): TmdbRequest | null {
  const bearer = process.env.TMDB_BEARER_TOKEN;
  const apiKey = process.env.TMDB_API_KEY;
  if (!bearer && !apiKey) return null;
  const query = new URLSearchParams(params);
  if (!bearer && apiKey) query.set("api_key", apiKey);
  const queryString = query.toString();
  const suffix = queryString === "" ? "" : `?${queryString}`;
  return {
    url: `https://api.themoviedb.org/3${path}${suffix}`,
    init: bearer ? { headers: { Authorization: `Bearer ${bearer}` } } : {},
  };
}
