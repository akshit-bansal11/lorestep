/** Mirrors `entries_ext_source_check`. */
export const EXT_SOURCES = ["tmdb", "omdb", "mal", "igdb"] as const;

/** Caps; the text lengths mirror the `entries` CHECK constraints (DB-24). */
export const ENTRY_LIMITS = {
  /** Live entries per user (PLAN.md section 4). */
  perUser: 5000,
  title: 160,
  notes: 4000,
  imageUrl: 500,
  extId: 64,
  gameId: 64,
  query: 160,
  cursor: 200,
  repeatCount: 999,
  progressValue: 100_000,
  pageDefault: 50,
  pageMax: 100,
  /** PLAN.md section 5: every JSON body. */
  bodyBytes: 64 * 1024,
} as const;

/** Rating scale (`entries_rating_range`). */
export const RATING_MIN = 1;
export const RATING_MAX = 10;

export const YEAR_MIN = 1800;
export const YEAR_MAX = 2200;

/**
 * Dogear `cleanTitle` (dogear/core/store.js): control and line/paragraph separators become spaces;
 * format characters (zero-width, bidi overrides, BOM) are dropped except ZWNJ / ZWJ, which shape
 * Indic titles and emoji.
 */
export const TITLE_BREAKS = /[\p{Cc}\p{Zl}\p{Zp}]/gu;
export const TITLE_FORMAT = /\p{Cf}/gu;
export const TITLE_JOINERS = new Set([0x200c, 0x200d]);
export const TITLE_CLEAN_MAX = 200;
/** A normalised title shorter than this is too little to match on and becomes "". */
export const TITLE_NORM_MIN = 2;

/** `updated_at::text` as Postgres prints a timestamptz. */
export const CURSOR_AT_PATTERN =
  /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d{1,6})?([+-]\d{2}(:?\d{2})?|Z)$/;
export const CURSOR_SEPARATOR = "|";
