import type { MediaKind, MetadataResult } from "@/types/metadata/metadata";

const isPositive = (value?: number | null) =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

/** Fields a movie or series should carry that this metadata lacks (the UI offers to fill them). */
export function getMissingFields(data: MetadataResult, kind: MediaKind): string[] {
  const missing: string[] = [];
  if (!data.title?.trim()) missing.push("title");
  if (data.type !== kind) missing.push("type");
  if (!data.description?.trim()) missing.push("description");
  if (!data.year?.trim()) missing.push("year");
  if (typeof data.rating !== "number") missing.push("rating");
  if (!data.genresThemes?.length) missing.push("genresThemes");
  if (kind === "movie" && !isPositive(data.lengthMinutes)) missing.push("lengthMinutes");
  if (kind === "series" && !isPositive(data.episodeCount)) missing.push("episodeCount");
  return missing;
}

const union = <T>(a?: T[], b?: T[]) => [...new Set([...(a ?? []), ...(b ?? [])])];

/** Prefer `primary`, fill its gaps from `secondary`; longer description and higher rating win. */
export function mergeMetadata(
  primary: MetadataResult | null,
  secondary: MetadataResult | null,
): MetadataResult | null {
  if (primary === null || secondary === null) return primary ?? secondary;

  const primaryText = primary.description ?? "";
  const secondaryText = secondary.description ?? "";
  const ratings = [primary.rating, secondary.rating].filter(
    (value): value is number => typeof value === "number",
  );

  return {
    title: primary.title || secondary.title,
    description: primaryText.length >= secondaryText.length ? primaryText : secondaryText,
    year: primary.year || secondary.year,
    type: primary.type ?? secondary.type,
    image: primary.image ?? secondary.image,
    rating: ratings.length > 0 ? Math.max(...ratings) : null,
    tmdbRating: primary.tmdbRating ?? secondary.tmdbRating ?? null,
    imdbRating: primary.imdbRating ?? secondary.imdbRating ?? null,
    lengthMinutes: primary.lengthMinutes ?? secondary.lengthMinutes ?? null,
    episodeCount: primary.episodeCount ?? secondary.episodeCount ?? null,
    chapterCount: primary.chapterCount ?? secondary.chapterCount ?? null,
    genresThemes: union(primary.genresThemes, secondary.genresThemes),
    genreIds: union(primary.genreIds, secondary.genreIds),
    cast: union(primary.cast, secondary.cast).slice(0, 10),
    director: primary.director || secondary.director || null,
    producer: primary.producer || secondary.producer || null,
  };
}
