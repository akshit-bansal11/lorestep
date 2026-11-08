import { fetchGuardedText } from "@/lib/http/guard-url";
import { searchOmdb } from "@/lib/search/omdb";
import { searchTmdb } from "@/lib/search/tmdb";
import type { ParsedMediaUrl, ResolvedMedia, SearchResult } from "@/types/metadata/metadata";

const MAX_TITLE_LENGTH = 200;

const decodeEntities = (text: string) =>
  text
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, "&");

const stripService = (text: string) =>
  text
    .replace(
      /^(Netflix|Amazon|Prime Video|Apple TV\+?|Disney\+?|Hulu|HBO Max|Peacock|Paramount\+?|Crunchyroll)\s*[:|]\s*/i,
      "",
    )
    .replace(/\s*[-–—|:]\s*(Netflix|Amazon|Prime Video|Watch|Stream|IMDb).*$/i, "")
    .replace(/\s*\(\d{4}\).*$/, "")
    .trim();

const usable = (title: string | undefined) => {
  const clean = title === undefined ? "" : decodeEntities(stripService(title));
  return clean !== "" && clean.length < MAX_TITLE_LENGTH ? clean : null;
};

/** The page's own title: JSON-LD name, else og:title, else <title>. Pure. */
export function extractTitle(html: string): string | null {
  for (const block of html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      const parsed: unknown = JSON.parse(block[1] ?? "");
      if (typeof parsed === "object" && parsed !== null && "name" in parsed) {
        const title = typeof parsed.name === "string" ? usable(parsed.name) : null;
        if (title !== null) return title;
      }
    } catch {
      // Not every JSON-LD block is valid JSON; the next source covers it.
    }
  }
  return (
    usable(html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i)?.[1]) ??
    usable(html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:title["']/i)?.[1]) ??
    usable(html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1])
  );
}

const toResolved = (hit: SearchResult): ResolvedMedia => ({
  id: hit.id,
  title: hit.title,
  image: hit.image,
  year: hit.year,
  type: hit.type,
  description: hit.overview,
  rating: hit.rating,
});

/** Best title match: TMDB first, OMDb as the fallback. */
export async function resolveByTitle(title: string): Promise<ResolvedMedia | null> {
  const tmdb = await searchTmdb(title);
  if (tmdb.results[0]) return toResolved(tmdb.results[0]);
  const omdb = await searchOmdb(title);
  return omdb.results[0] ? toResolved(omdb.results[0]) : null;
}

const REFERERS = { netflix: "https://www.netflix.com/", prime: "https://www.primevideo.com/" };

/**
 * Netflix and Prime Video pages expose no API: read the page's title (SSRF-guarded fetch) and look
 * the title up. Throws UnsafeUrlError if the page redirects off its host.
 */
export async function resolveStreaming(parsed: ParsedMediaUrl): Promise<ResolvedMedia | null> {
  if (parsed.source !== "netflix" && parsed.source !== "prime") return null;
  const html = await fetchGuardedText(parsed.cleanUrl, {
    "User-Agent": "Mozilla/5.0 (compatible; Lorestep/1.0)",
    Accept: "text/html,application/xhtml+xml",
    "Accept-Language": "en-US,en;q=0.9",
    Referer: REFERERS[parsed.source],
  });
  const title = html === null ? null : extractTitle(html);
  return title === null ? null : resolveByTitle(title);
}
