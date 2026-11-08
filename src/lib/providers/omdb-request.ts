/** An OMDb URL, or null when `OMDB_API_KEY` is unset. OMDb only takes its key as a query param. */
export function omdbUrl(params: Record<string, string>): string | null {
  const apiKey = process.env.OMDB_API_KEY;
  if (!apiKey) return null;
  return `https://www.omdbapi.com/?${new URLSearchParams({ apikey: apiKey, ...params })}`;
}
