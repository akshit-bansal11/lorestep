import {
  REEL_ACCENT_EVERY,
  REEL_ACCENT_OFFSET,
  REEL_FIELD_EVERY,
  REEL_FIELD_OFFSET,
  REEL_TILE_ACCENT_CLASS,
  REEL_TILE_FIELD_CLASS,
  REEL_TILE_PLAIN_CLASS,
} from "@/constants/home/reel";

/** Fill classes for tile `index` of a lane: mostly plain, accent and field sparingly. */
export function reelTileFill(index: number): string {
  if (index % REEL_ACCENT_EVERY === REEL_ACCENT_OFFSET) return REEL_TILE_ACCENT_CLASS;
  if (index % REEL_FIELD_EVERY === REEL_FIELD_OFFSET) return REEL_TILE_FIELD_CLASS;
  return REEL_TILE_PLAIN_CLASS;
}
