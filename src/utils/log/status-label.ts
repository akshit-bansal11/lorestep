import { STATUS_LABELS } from "@/constants/log/copy";
import type { Entry } from "@/types/log/entry";
import { isMediaKind } from "@/utils/log/media-kind";

/** The word a row shows: the kind's verb for the status, or the game shelf when that says more. */
export function statusLabel(entry: Entry): string {
  if (!isMediaKind(entry.kind)) return "";
  if (entry.kind === "game") {
    if (entry.shelf === "wishlist") return "Wishlist";
    if (entry.shelf === "trash") return "Not interested";
    if (entry.shelf === "own" && entry.status === null) return "Owned";
    if (entry.shelf === "own" && entry.status === "planned") return "Backlog";
  }
  return entry.status === null ? "" : (STATUS_LABELS[entry.kind][entry.status] ?? entry.status);
}
