import { TMDB_IMAGE_BASE } from "@/constants/metadata/metadata";
import { safeFetchJson } from "@/lib/http/safe-fetch";
import { namesOf, round1, yearOf } from "@/lib/providers/format";
import { tmdbRequest } from "@/lib/providers/tmdb-request";
import type { MediaKind, MetadataResult } from "@/types/metadata/metadata";

export type TmdbKind = Extract<MediaKind, "movie" | "series">;

export interface TmdbDetails {
  title?: string;
  name?: string;
  overview?: string;
  release_date?: string;
  first_air_date?: string;
  runtime?: number;
  episode_run_time?: number[];
  number_of_episodes?: number;
  poster_path?: string | null;
  vote_average?: number;
  genres?: Array<{ id?: number; name?: string }>;
  production_companies?: Array<{ name?: string }>;
}

export interface TmdbCredits {
  cast?: Array<{ name?: string }>;
  crew?: Array<{ name?: string; job?: string }>;
}

const tmdbPath = (kind: TmdbKind) => (kind === "series" ? "tv" : "movie");
const isNumber = (value: unknown): value is number => typeof value === "number";

/** Pure: TMDB details + credits into the shared metadata shape. */
export function mapTmdbDetails(
  data: TmdbDetails,
  kind: TmdbKind,
  credits: TmdbCredits,
): MetadataResult {
  const crew = Array.isArray(credits.crew) ? credits.crew : [];
  const crewNamed = (job: string) => crew.find((member) => member.job === job)?.name;
  const director =
    crewNamed("Director") ??
    (kind === "series" ? crewNamed("Executive Producer") : undefined) ??
    null;
  const vote = isNumber(data.vote_average) ? round1(data.vote_average) : null;

  return {
    title: data.title || data.name,
    description: data.overview || "",
    year: yearOf(kind === "movie" ? data.release_date : data.first_air_date),
    type: kind,
    image: data.poster_path ? `${TMDB_IMAGE_BASE}${data.poster_path}` : null,
    rating: vote,
    tmdbRating: vote,
    lengthMinutes:
      kind === "movie" ? (data.runtime ?? null) : (data.episode_run_time?.[0] ?? null),
    episodeCount: kind === "series" ? (data.number_of_episodes ?? null) : null,
    genresThemes: namesOf(data.genres),
    genreIds: Array.isArray(data.genres)
      ? data.genres.map((genre) => genre.id).filter(isNumber)
      : [],
    cast: namesOf(credits.cast, 5),
    director,
    producer: data.production_companies?.[0]?.name ?? null,
  };
}

async function searchTmdbId(
  title: string,
  kind: TmdbKind,
  year?: string | null,
): Promise<string | null> {
  const yearParam = kind === "movie" ? "year" : "first_air_date_year";
  const request = tmdbRequest(`/search/${tmdbPath(kind)}`, {
    query: title,
    ...(year ? { [yearParam]: year } : {}),
  });
  if (request === null) return null;
  const res = await safeFetchJson<{ results?: Array<{ id?: number }> }>(request.url, request.init);
  const id = res.ok ? res.data.results?.[0]?.id : undefined;
  return id === undefined ? null : String(id);
}

/** TMDB metadata by numeric id, or by a title search when `id` is not a TMDB id. */
export async function fetchTmdbMetadata(
  id: string | null,
  title: string | null,
  kind: TmdbKind,
  year?: string | null,
): Promise<MetadataResult | null> {
  const resolved =
    id !== null && /^\d+$/.test(id)
      ? id
      : title !== null
        ? await searchTmdbId(title, kind, year)
        : null;
  if (resolved === null) return null;

  const details = tmdbRequest(`/${tmdbPath(kind)}/${resolved}`, { language: "en-US" });
  const credits = tmdbRequest(`/${tmdbPath(kind)}/${resolved}/credits`, { language: "en-US" });
  if (details === null || credits === null) return null;

  const [detailsRes, creditsRes] = await Promise.all([
    safeFetchJson<TmdbDetails>(details.url, details.init),
    safeFetchJson<TmdbCredits>(credits.url, credits.init),
  ]);
  if (!detailsRes.ok) return null;
  return mapTmdbDetails(detailsRes.data, kind, creditsRes.ok ? creditsRes.data : {});
}
