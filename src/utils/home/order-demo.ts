import type { Franchise } from "@/types/canon/canon";
import type { DemoFranchise, DemoRow } from "@/types/home/order-demo";

/**
 * Franchises whose story order differs most from release order (PLAN.md section C).
 * Same-year games keep story order, so the switch never reshuffles ties.
 */
export const DEMO_FRANCHISE_IDS = ["metal-gear", "metroid", "ace-attorney"] as const;

/** Demo franchises in `DEMO_FRANCHISE_IDS` order, rows in story order. A missing id is skipped. */
export function buildDemo(franchises: readonly Franchise[]): DemoFranchise[] {
  return DEMO_FRANCHISE_IDS.flatMap((id) => {
    const franchise = franchises.find((candidate) => candidate.id === id);
    if (franchise === undefined) return [];
    const rows = franchise.games
      .map((game) => ({
        id: game.id,
        title: game.title,
        year: game.year,
        tier: game.tier,
        story: game.order,
      }))
      .sort((a, b) => a.story - b.story);
    return [{ id: franchise.id, name: franchise.name, rows }];
  });
}

/** Rows sorted by release year, ties broken by story order. Returns a copy. */
export function releaseRank(rows: readonly DemoRow[]): DemoRow[] {
  return [...rows].sort((a, b) => a.year - b.year || a.story - b.story);
}
