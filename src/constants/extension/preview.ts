import type { CanonicalStatus } from "@/types/log/status";

export const EXTENSION_PREVIEW_STATES: readonly CanonicalStatus[] = [
  "planned",
  "in_progress",
  "completed",
  "on_hold",
  "dropped",
];
