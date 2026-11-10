import type { Tier } from "@/types/canon/canon";

/** One game in the home page's story/release switch. */
export interface DemoRow {
  id: string;
  title: string;
  year: number;
  tier: Tier;
  /** Position in the franchise's story order (`Game.order`). */
  story: number;
}

export interface DemoFranchise {
  id: string;
  name: string;
  /** Story order, the order the data ships in. */
  rows: DemoRow[];
}
