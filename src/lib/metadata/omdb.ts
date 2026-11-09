import { safeFetchJson } from "@/lib/http/safe-fetch";
import { round1, yearOf } from "@/lib/providers/format";
import { omdbUrl } from "@/lib/providers/omdb-request";
import type { MediaKind, MetadataResult } from "@/types/metadata/metadata";

export interface OmdbTitle {
  Response?: string;
  Title?: string;
  Year?: string;
  Plot?: string;
  Runtime?: string;
  Genre?: string;
  Actors?: string;
  Poster?: string;
  Type?: string;
  imdbRating?: string;
  Director?: string;
  Production?: string;
  Writer?: string;
}

/** OMDb writes "N/A" for a missing field. */
const field = (value?: string) => (value && value !== "N/A" ? value : null);
const list = (value?: string) =>
  (field(value) ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

/** Pure: an OMDb title payload into the shared shape. Without `kind` the payload's Type decides. */
export function mapOmdbTitle(data: OmdbTitle, kind?: MediaKind): MetadataResult {
  const rated = Number(field(data.imdbRating));
  const imdbRating = Number.isFinite(rated) && rated > 0 ? round1(rated) : null;
  const minutes = Number(data.Runtime?.match(/\d+/)?.[0]);

  return {
    title: data.Title || "",
    description: field(data.Plot) ?? "",
    year: yearOf(data.Year),
    type: kind ?? (data.Type === "series" ? "series" : "movie"),
    image: field(data.Poster),
    rating: imdbRating,
    imdbRating,
    lengthMinutes: Number.isFinite(minutes) ? minutes : null,
    genresThemes: list(data.Genre),
    cast: list(data.Actors),
    director: field(data.Director),
    producer: field(data.Production) ?? field(data.Writer),
  };
}

/** One OMDb lookup by IMDb id (`i`) or title (`t`); null when unconfigured, failed or not found. */
export async function fetchOmdbTitle(
  params: Record<string, string>,
  kind?: MediaKind,
): Promise<MetadataResult | null> {
  const url = omdbUrl({ ...params, plot: "full" });
  if (url === null) return null;
  const res = await safeFetchJson<OmdbTitle>(url);
  if (!res.ok || res.data.Response === "False") return null;
  return mapOmdbTitle(res.data, kind);
}

/** OMDb metadata for a movie or series: by IMDb id when given, else by title. */
export async function fetchOmdbMetadata(
  id: string | null,
  title: string | null,
  kind: "movie" | "series",
  year?: string | null,
): Promise<MetadataResult | null> {
  if (id !== null && /^tt\d+$/i.test(id)) {
    const byId = await fetchOmdbTitle({ i: id }, kind);
    if (byId) return byId;
  }
  if (title === null) return null;
  return fetchOmdbTitle({ t: title, type: kind, ...(year ? { y: year } : {}) }, kind);
}
