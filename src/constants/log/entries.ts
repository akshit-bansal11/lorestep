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
  /** POST /api/v1/import/local: marks per request, and its body cap (1000 marks fit easily). */
  importMax: 1000,
  importBytes: 256 * 1024,
  /** How long a soft-deleted entry can be restored; the purge cron removes it after this. */
  restoreWindowDays: 30,
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

/**
 * `updated_at::text` as Postgres prints a timestamptz. The named groups let `decodeCursor` check
 * the parts form a real instant, so 2026-99-99 never reaches the `::timestamptz` cast.
 */
export const CURSOR_AT_PATTERN =
  /^(?<y>\d{4})-(?<mo>\d{2})-(?<d>\d{2})[ T](?<h>\d{2}):(?<mi>\d{2}):(?<s>\d{2})(\.\d{1,6})?((?<oh>[+-]\d{2})(:?(?<om>\d{2}))?|Z)$/;

/** Postgres accepts UTC offsets up to ±15:59. */
export const CURSOR_MAX_OFFSET_HOURS = 15;
export const CURSOR_SEPARATOR = "|";
