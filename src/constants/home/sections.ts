/** Headings, ledes and labels for the home sections built in M3. No JSX; claims per docs/design/PLAN.md section B. */

export const HERO_TITLE = "Every story, in the order it happened.";
export const HERO_LEDE =
  "Story-order guides for movies, series and games, a tracker that keeps your place, and an extension that marks what you watch.";
export const HERO_ACTIONS = {
  primary: { label: "Browse watch orders", href: "/screen" },
  ghost: { label: "Open the games table", href: "/games" },
} as const;

/** Stat labels in display order. */
export const HERO_STATS = [
  { id: "franchises", label: "Game franchises" },
  { id: "games", label: "Games" },
  { id: "chronologies", label: "Screen chronologies" },
  { id: "titles", label: "Movies and series" },
] as const;

export const WAYS_TITLE = "One account, three ways in.";
export const BOOKS_EMPTY = "No dataset yet";

export const GAMES_TITLE = "Games, in story order.";
export const GAMES_LEDE =
  "One franchise as it appears on Lorestep: where to start, how long each game takes and where to play it today.";
export const GAMES_COLUMNS = {
  rank: "#",
  game: "Game",
  released: "Released",
  hours: "Hours",
  platform: "Play it on",
} as const;
export const GAMES_START = "Start here";
export const GAMES_HOURS_UNKNOWN = "Unknown";
export const GAMES_ALL_LINK = "See every franchise";

export const CLOSE_TITLE = "Start at step one.";
export const CLOSE_LEDE = "Free and open source. Browsing needs no account.";
export const CLOSE_ACTION = { label: "Create an account", href: "/sign-up" } as const;
