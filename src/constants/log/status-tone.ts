import type { CanonicalStatus } from "@/types/log/status";
import type { StatusTone } from "@/types/log/status-chip";

/**
 * Fill and glyph per canonical status. Glyph paths are copied from
 * `extension/core/states.js` (D.ICONS): in_progress = watching, planned = plan, on_hold = hold.
 */
export const STATUS_TONE: Record<CanonicalStatus, StatusTone> = {
  in_progress: { fill: "bg-status-in-progress", path: "M7.5 4.5l12 7.5-12 7.5z", filled: true },
  planned: { fill: "bg-status-planned", path: "M6 3.5h12v17l-6-4.2-6 4.2z", filled: false },
  completed: { fill: "bg-status-completed", path: "M4.5 12.5l4.8 4.8L19.5 7", filled: false },
  on_hold: { fill: "bg-status-on-hold", path: "M8.5 5v14M15.5 5v14", filled: false },
  dropped: { fill: "bg-status-dropped", path: "M6 6l12 12M18 6L6 18", filled: false },
};
