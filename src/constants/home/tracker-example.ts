import type { TrackerExampleRow } from "@/types/home/tracker-example";

/** Made-up statuses on real titles, to show the layout. Never presented as anyone's data. */
export const TRACKER_EXAMPLE_ROWS: readonly TrackerExampleRow[] = [
  { id: "mgs3", title: "Metal Gear Solid 3: Snake Eater", status: "in_progress" },
  { id: "mg", title: "Metal Gear", status: "completed" },
  { id: "mg2", title: "Metal Gear 2: Solid Snake", status: "planned" },
  { id: "mgs", title: "Metal Gear Solid", status: "on_hold" },
];

export const TRACKER_EXAMPLE_CAPTION =
  "Example. These statuses are made up to show the layout; nothing here is your data.";
