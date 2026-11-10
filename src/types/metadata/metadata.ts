import type { MEDIA_KINDS } from "@/constants/metadata/metadata";

export type MediaKind = (typeof MEDIA_KINDS)[number];

export interface MetadataResult {
  title?: string;
  description?: string;
  year?: string;
  type?: MediaKind;
  image?: string | null;
  rating?: number | null;
  tmdbRating?: number | null;
  imdbRating?: number | null;
  lengthMinutes?: number | null;
  episodeCount?: number | null;
  chapterCount?: number | null;
  genresThemes?: string[];
  genreIds?: number[];
  cast?: string[];
  director?: string | null;
  producer?: string | null;
}

export interface SearchResult {
  id: string;
  title: string;
  image: string | null;
  year: string;
  type: MediaKind;
  overview: string;
  rating: number | null;
}

/** What one provider's search returned; `error` is a user-safe sentence, empty when fine. */
export interface ProviderSearch {
  results: SearchResult[];
  error: string;
}

export type ResolvedMedia = MetadataResult & { id: string };

export type LinkSource = "imdb" | "tmdb" | "mal" | "netflix" | "prime";

export interface ParsedMediaUrl {
  source: LinkSource;
  id: string;
  /** Known from the URL itself (TMDB and MAL paths); null for IMDb, Netflix, Prime. */
  mediaType: MediaKind | null;
  /** Canonical https URL to read for Netflix and Prime. */
  cleanUrl: string;
}

/** `status` is the provider's HTTP status; absent for a timeout or network error. */
export type FetchResult<T> = { ok: true; data: T } | { ok: false; error: string; status?: number };
