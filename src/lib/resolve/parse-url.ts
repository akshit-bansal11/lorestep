import type { ParsedMediaUrl } from "@/types/metadata/metadata";

const bareHost = (url: URL) => url.hostname.toLowerCase().replace(/^www\./, "");

/**
 * Read a link already accepted by `assertSafeUrl` (so the host is on the allowlist) into the
 * provider and id it names. Null when the path carries no recognisable id.
 */
export function parseMediaUrl(url: URL): ParsedMediaUrl | null {
  const host = bareHost(url);
  const path = url.pathname;

  if (host === "imdb.com") {
    const id = path.match(/\/title\/(tt\d+)/i)?.[1];
    return id ? { source: "imdb", id, mediaType: null, cleanUrl: url.href } : null;
  }

  if (host === "themoviedb.org") {
    const movie = path.match(/\/movie\/(\d+)/)?.[1];
    if (movie) return { source: "tmdb", id: movie, mediaType: "movie", cleanUrl: url.href };
    const tv = path.match(/\/tv\/(\d+)/)?.[1];
    return tv ? { source: "tmdb", id: tv, mediaType: "series", cleanUrl: url.href } : null;
  }

  if (host === "myanimelist.net") {
    const anime = path.match(/\/anime\/(\d+)/)?.[1];
    if (anime) return { source: "mal", id: anime, mediaType: "anime", cleanUrl: url.href };
    const manga = path.match(/\/manga\/(\d+)/)?.[1];
    return manga ? { source: "mal", id: manga, mediaType: "manga", cleanUrl: url.href } : null;
  }

  if (host === "netflix.com") {
    const jbv = url.searchParams.get("jbv");
    const id = path.match(/\/title\/(\d+)/)?.[1] ?? (jbv && /^\d+$/.test(jbv) ? jbv : null);
    return id
      ? {
          source: "netflix",
          id,
          mediaType: null,
          cleanUrl: `https://www.netflix.com/title/${id}`,
        }
      : null;
  }

  // primevideo.com and the amazon.* storefronts the allowlist admits.
  const asin = path.match(/\/(?:gp\/video\/detail|detail|dp)\/([A-Z0-9]+)/i)?.[1];
  return asin
    ? { source: "prime", id: asin, mediaType: null, cleanUrl: `https://${url.hostname}/dp/${asin}` }
    : null;
}
