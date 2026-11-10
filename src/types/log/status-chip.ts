import type { CanonicalStatus, EntryKind } from "@/types/log/status";

export interface StatusChipProps {
  status: CanonicalStatus;
  kind: EntryKind;
  className?: string;
}

export interface StatusTone {
  /** Tailwind fill class, written out in full so the scanner sees it. */
  fill: string;
  /** SVG path data on a 24x24 grid. */
  path: string;
  /** Solid shape (watching) versus stroked line. */
  filled: boolean;
}
