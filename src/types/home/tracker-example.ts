import type { CanonicalStatus } from "@/types/log/status";

export interface TrackerExampleRow {
  id: string;
  title: string;
  status: CanonicalStatus;
}
