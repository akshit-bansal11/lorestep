import type { Franchise } from "@/types/canon/canon";
import type { ScreenFranchise } from "@/types/canon/screen";

export const REEL_GAME_COUNT = 24;

function byCountThenName(a: Franchise, b: Franchise): number {
  if (a.games.length !== b.games.length) return b.games.length - a.games.length;
  if (a.name === b.name) return 0;
  return a.name < b.name ? -1 : 1;
}

/**
 * Names for the home reel: the 24 game franchises with the most games (ties by name) followed
 * by every screen franchise in its own order. Names only; duplicates are dropped.
 */
export function reelNames(
  franchises: readonly Franchise[],
  screen: readonly ScreenFranchise[],
): string[] {
  const games = [...franchises]
    .sort(byCountThenName)
    .slice(0, REEL_GAME_COUNT)
    .map((franchise) => franchise.name);
  const titles = [...screen].sort((a, b) => a.order - b.order).map((franchise) => franchise.title);
  return [...new Set([...games, ...titles])];
}
