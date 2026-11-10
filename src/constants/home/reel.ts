export const REEL_LABELS = [
  "Some of the franchises on Lorestep",
  "More franchises on Lorestep",
] as const;
export const REEL_PAUSE_LABEL = "Pause scrolling";

/** Each lane renders its list twice: the real one, then an `aria-hidden` copy for the loop. */
export const REEL_COPIES = ["real", "copy"] as const;

/** Tile N of a lane is filled when N % EVERY === OFFSET, so the colour stays sparse. */
export const REEL_ACCENT_EVERY = 7;
export const REEL_ACCENT_OFFSET = 3;
export const REEL_FIELD_EVERY = 11;
export const REEL_FIELD_OFFSET = 6;

export const REEL_TILE_CLASS =
  "flex h-[76px] flex-none items-center whitespace-nowrap rounded-full px-[26px] text-[22px]";
export const REEL_TILE_PLAIN_CLASS = "bg-surface text-ink";
export const REEL_TILE_ACCENT_CLASS = "bg-accent text-accent-ink";
export const REEL_TILE_FIELD_CLASS = "bg-field text-field-ink";

export const REEL_PAUSE_CLASS =
  "h-10 rounded-full bg-raise px-4 font-semibold text-[15px] text-ink transition-colors duration-(--dur-2) hover:bg-line aria-pressed:bg-accent aria-pressed:text-accent-ink motion-reduce:hidden";
