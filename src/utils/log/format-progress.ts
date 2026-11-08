import type { Progress } from "@/types/log/entry";
import type { MediaKind } from "@/types/metadata/metadata";

function playTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

/** "S1 E14", "E14", "Ch 90 · Vol 9", "2h 5m", or "" when nothing is tracked. */
export function formatProgress(kind: MediaKind, progress: Progress): string {
  const { seasons, episodes, chapters, volumes, playMinutes } = progress;
  const parts: string[] = [];
  if (kind === "series") {
    if (seasons !== undefined) parts.push(`S${seasons}`);
    if (episodes !== undefined) parts.push(`E${episodes}`);
    return parts.join(" ");
  }
  if (kind === "anime") return episodes === undefined ? "" : `E${episodes}`;
  if (kind === "manga") {
    if (chapters !== undefined) parts.push(`Ch ${chapters}`);
    if (volumes !== undefined) parts.push(`Vol ${volumes}`);
    return parts.join(" · ");
  }
  if (kind === "game" && playMinutes !== undefined) return playTime(playMinutes);
  return "";
}
