import type { ENRICH_KINDS } from "@/constants/metadata/enrich";

export type EnrichKind = (typeof ENRICH_KINDS)[number];

/** What one provider says about an exactly matching title. */
export interface EnrichHit {
  year: number | null;
  image: string | null;
  /** TMDB: Animation from JP, KR or CN. MyAnimeList: always, it lists only anime. */
  anime: boolean;
  /** TMDB lists the Animation genre (16). MyAnimeList: always true. */
  animation: boolean;
}

/** The fields enrichment reads from a TMDB `/search/movie` or `/search/tv` result. */
export interface TmdbMatchItem {
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  genre_ids?: number[];
  original_language?: string;
  origin_country?: string[];
}

/** The fields enrichment reads from a MyAnimeList `/v2/anime` search result. */
export interface MalMatchItem {
  node: {
    title?: string;
    alternative_titles?: { en?: string; synonyms?: string[] };
    main_picture?: { medium?: string; large?: string };
    start_date?: string;
  };
}

/** A live entry still missing its year or poster, with the anime-upgrade guards read alongside. */
export interface EnrichCandidate {
  id: string;
  userId: string;
  kind: string;
  title: string;
  titleNorm: string;
  year: number | null;
  /** Created by the extension and never touched by the user (`ANIME_MOVABLE`). */
  movable: boolean;
  /** Another live entry of the same user is already kind anime with this `title_norm`. */
  twin: boolean;
}

/** Counts of one enrichment run. */
export interface EnrichResult {
  scanned: number;
  filled: number;
  upgraded: number;
  failed: number;
}
