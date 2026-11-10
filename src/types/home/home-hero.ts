import type { ReactNode } from "react";

import type { SectionCounts } from "@/types/home/section-counts";

export interface HomeHeroProps {
  counts: SectionCounts;
  /** The story/release switch, rendered beside the headline copy. */
  demo: ReactNode;
}
