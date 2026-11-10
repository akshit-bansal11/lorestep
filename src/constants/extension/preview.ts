import type { PreviewPoster } from "@/types/extension/preview-poster";
import type { CanonicalStatus } from "@/types/log/status";

export const EXTENSION_PREVIEW_STATES: readonly CanonicalStatus[] = [
  "planned",
  "in_progress",
  "completed",
  "on_hold",
  "dropped",
];

export const EXTENSION_PREVIEW_POSTERS: readonly PreviewPoster[] = [
  { title: "Andor", fold: "bg-status-in-progress", surface: "bg-raise" },
  { title: "The Fellowship of the Ring", fold: "bg-status-completed", surface: "bg-surface" },
  { title: "Metal Gear Solid", fold: "bg-status-planned", surface: "bg-raise" },
  { title: "Iron Man", fold: "bg-status-on-hold", surface: "bg-surface" },
  { title: "Mass Effect", fold: null, surface: "bg-raise" },
  { title: "Halo", fold: "bg-status-dropped", surface: "bg-surface" },
];
