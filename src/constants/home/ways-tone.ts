/** Tile colours for the three ways in, by `HOME_WAYS` id. Body text passes contrast on its own ground only. */
export const WAYS_TONE = {
  "watch-orders": { tile: "bg-surface text-ink", body: "text-muted" },
  tracker: { tile: "bg-field text-field-ink", body: "text-field-ink" },
  extension: { tile: "bg-accent text-accent-ink", body: "text-accent-ink" },
} as const;

/** Grid column spans at lg, 5/4/3 wide. */
export const WAYS_SPAN = ["lg:col-span-5", "lg:col-span-4", "lg:col-span-3"] as const;
