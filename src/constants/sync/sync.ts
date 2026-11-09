import type { SyncKind } from "@/types/sync/sync";

/** Mirrors `entry_links_platform_check` and the extension's `D.PLATFORMS` ids (extension/core/states.js). */
export const SYNC_PLATFORMS = [
  "netflix",
  "primevideo",
  "hotstar",
  "zee5",
  "hbomax",
  "crunchyroll",
] as const;

/** The kinds the extension can mark; games, manga and the rest never match a streaming tile. */
export const SYNC_KINDS = ["movie", "series", "anime"] as const;

/**
 * D-14 kind compatibility: which stored kinds a mark of this kind may match. A mark with no kind
 * matches any of `SYNC_KINDS`.
 */
export const COMPATIBLE_KINDS: Readonly<Record<SyncKind, readonly SyncKind[]>> = {
  movie: ["movie"],
  series: ["series", "anime"],
  anime: ["series", "anime"],
};

/** Mirrors `entry_links_platform_id_check`. */
export const PLATFORM_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

export const SYNC_LIMITS = {
  /** Marks per push (PLAN.md section 5) and the push body cap. */
  pushMax: 200,
  pushBytes: 256 * 1024,
  pullDefault: 200,
  pullMax: 500,
  platformId: 128,
  url: 500,
  /** A client clock this far ahead is clamped, so one bad clock cannot win every later merge. */
  futureSkewMs: 5 * 60 * 1000,
} as const;
