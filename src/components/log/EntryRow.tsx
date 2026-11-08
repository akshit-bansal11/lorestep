"use client";

import { CELL_CLASS, NUM_CLASS } from "@/constants/canon/ui";
import { LIBRARY_COPY } from "@/constants/log/copy";
import type { Entry } from "@/types/log/entry";
import { cn } from "@/utils/cn";
import { formatProgress } from "@/utils/log/format-progress";
import { isMediaKind } from "@/utils/log/media-kind";
import { statusLabel } from "@/utils/log/status-label";

interface EntryRowProps {
  entry: Entry;
  onOpen: (entry: Entry) => void;
}

const FAINT = <span className="text-faint">{LIBRARY_COPY.noValue}</span>;

/**
 * One library row. The title is the row's button (it opens the editor), so the row is reached and
 * activated from the keyboard without a click handler on the `<tr>`. Year and progress fold under
 * the title below the `sm` breakpoint instead of scrolling the table sideways.
 */
export default function EntryRow({ entry, onOpen }: EntryRowProps) {
  const progress = isMediaKind(entry.kind) ? formatProgress(entry.kind, entry.progress) : "";
  const status = statusLabel(entry);
  const secondary = [entry.year === null ? "" : String(entry.year), progress]
    .filter(Boolean)
    .join(" · ");

  return (
    <tr>
      <th className={cn(CELL_CLASS, "text-left font-normal")} scope="row">
        <button
          aria-label={LIBRARY_COPY.open.replace("{title}", entry.title)}
          className="flex min-h-11 w-full flex-col items-start justify-center rounded-control text-left text-[13px] text-ink transition-colors duration-[160ms] hover:text-accent motion-reduce:transition-none"
          onClick={() => onOpen(entry)}
          type="button"
        >
          {entry.title}
          {secondary !== "" && (
            <span className={cn(NUM_CLASS, "text-[11px] text-muted sm:hidden")}>{secondary}</span>
          )}
        </button>
      </th>
      <td className={cn(CELL_CLASS, NUM_CLASS, "hidden text-muted sm:table-cell")}>
        {entry.year ?? FAINT}
      </td>
      <td className={CELL_CLASS}>{status === "" ? FAINT : status}</td>
      <td className={cn(CELL_CLASS, NUM_CLASS)}>{entry.rating ?? FAINT}</td>
      <td className={cn(CELL_CLASS, NUM_CLASS, "hidden text-muted sm:table-cell")}>
        {progress === "" ? FAINT : progress}
      </td>
    </tr>
  );
}
