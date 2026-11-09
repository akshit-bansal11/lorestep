export const MEDIA_KINDS = ["movie", "series", "anime", "manga", "game"] as const;

/** Third-party calls: one attempt plus retries on 429/5xx/network, each bounded (BE-14). */
export const FETCH_TIMEOUT_MS = 8000;
export const FETCH_RETRY_COUNT = 2;
export const FETCH_RETRY_DELAY_MS = 250;

/** Per-instance best-effort caches: each serverless instance has its own copy. */
export const CACHE_TTL_MS = 5 * 60 * 1000;
export const CACHE_MAX_ENTRIES = 500;

export const SEARCH_MAX_RESULTS = 30;
export const SEARCH_PER_PROVIDER = 12;

export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

/** resolve-link: pages are only read for a title, so a head-sized slice is plenty. */
export const HTML_MAX_BYTES = 1_000_000;
export const MAX_REDIRECTS = 3;

const AMAZON_TLDS = [
  "com",
  "co.uk",
  "in",
  "de",
  "fr",
  "es",
  "it",
  "co.jp",
  "ca",
  "com.br",
  "com.mx",
  "com.au",
];

/** SSRF allowlist (PLAN.md section 11 R6): exact hosts, no wildcard subdomains. */
export const ALLOWED_LINK_HOSTS: ReadonlySet<string> = new Set(
  [
    "imdb.com",
    "themoviedb.org",
    "myanimelist.net",
    "netflix.com",
    "primevideo.com",
    ...AMAZON_TLDS.map((tld) => `amazon.${tld}`),
  ].flatMap((host) => [host, `www.${host}`]),
);
