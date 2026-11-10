import { ENTRY_LIMITS, YEAR_MAX, YEAR_MIN } from "@/constants/log/entries";
import {
  ANIME_COUNTRIES,
  ANIME_LANGUAGES,
  TMDB_ANIMATION_GENRE,
} from "@/constants/metadata/enrich";
import { TMDB_IMAGE_BASE } from "@/constants/metadata/metadata";
import { yearOf } from "@/lib/providers/format";
import type { EnrichHit, MalMatchItem, TmdbMatchItem } from "@/types/metadata/enrich";

/** A year the `entries.year` column accepts, else null. */
function toYear(date?: string): number | null {
  const year = Number(yearOf(date));
  return Number.isInteger(year) && year >= YEAR_MIN && year <= YEAR_MAX ? year : null;
}

/** An image URL the `entries_image_url_check` CHECK accepts, else null. */
function toImage(url?: string | null): string | null {
  return url?.startsWith("https://") && url.length <= ENTRY_LIMITS.imageUrl ? url : null;
}

/** Pure: a TMDB search result into a hit. Anime = Animation genre made in Japan, Korea or China. */
export function tmdbHit(item: TmdbMatchItem): EnrichHit {
  const animation = item.genre_ids?.includes(TMDB_ANIMATION_GENRE) ?? false;
  const east =
    ANIME_LANGUAGES.has(item.original_language ?? "") ||
    (item.origin_country ?? []).some((country) => ANIME_COUNTRIES.has(country));
  return {
    year: toYear(item.release_date || item.first_air_date),
    image: toImage(item.poster_path ? `${TMDB_IMAGE_BASE}${item.poster_path}` : null),
    animation,
    anime: animation && east,
  };
}

/** Pure: a MyAnimeList search result into a hit. Everything MAL lists is anime. */
export function malHit({ node }: MalMatchItem): EnrichHit {
  return {
    year: toYear(node.start_date),
    image: toImage(node.main_picture?.large ?? node.main_picture?.medium),
    animation: true,
    anime: true,
  };
}

/** Every title MyAnimeList knows the result by: main, English and synonyms. */
export function malTitles({ node }: MalMatchItem): string[] {
  return [
    node.title,
    node.alternative_titles?.en,
    ...(node.alternative_titles?.synonyms ?? []),
  ].filter((title): title is string => typeof title === "string" && title !== "");
}
