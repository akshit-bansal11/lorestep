import type { sectionCounts } from "@/lib/db/queries";

/** What `sectionCounts()` resolves to: the figures the landing page states. */
export type SectionCounts = Awaited<ReturnType<typeof sectionCounts>>;
