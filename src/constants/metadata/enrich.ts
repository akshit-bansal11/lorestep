/** Entry kinds the metadata enrichment looks up (TMDB movie, TMDB tv, MAL anime). */
export const ENRICH_KINDS = ["movie", "series", "anime"] as const;

/** Entries per run: each costs one TMDB and at most one MAL lookup, so about 40 calls. */
export const ENRICH_BATCH_SIZE = 20;
export const ENRICH_CONCURRENCY = 2;

/** No new entry is started after this much of a run: Vercel Hobby functions stop at 60 s. */
export const ENRICH_TIME_BUDGET_MS = 20_000;

/** Enrichment requests are not retried: a 429 or 5xx ends the run, the next one resumes. */
export const ENRICH_FETCH_RETRIES = 0;

/** TMDB's Animation genre id, the same on movie and tv. */
export const TMDB_ANIMATION_GENRE = 16;

/** Animation from Japan, Korea or China counts as anime (DECISIONS.md). */
export const ANIME_LANGUAGES: ReadonlySet<string> = new Set(["ja", "ko", "zh"]);
export const ANIME_COUNTRIES: ReadonlySet<string> = new Set(["JP", "KR", "CN"]);

/** MyAnimeList refuses a `q` under 3 characters; longer queries are cut to 64. */
export const MAL_QUERY_MIN = 3;
export const MAL_QUERY_MAX = 64;
export const MAL_MATCH_LIMIT = 5;
