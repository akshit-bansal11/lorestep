"use client";

import Blank from "@/components/log/Blank";
import ProgressCell from "@/components/log/ProgressCell";
import StatusCell from "@/components/log/StatusCell";
import { NUM_CLASS } from "@/constants/canon/ui";
import { LIBRARY_COPY } from "@/constants/log/copy";
import { LIBRARY_CELL_CLASS as CELL_CLASS } from "@/constants/log/library";
import type { Entry } from "@/types/log/entry";
import { cn } from "@/utils/cn";
import { formatDate } from "@/utils/log/format-date";
import { formatProgress } from "@/utils/log/format-progress";
import { isMediaKind } from "@/utils/log/media-kind";

interface EntryRowProps {
  entry: Entry;
  onOpen: (entry: Entry) => void;
}

const FAINT = <Blank />;

function dateCell(iso: string | null) {
  const text = formatDate(iso);
  return text === "" ? FAINT : text;
}

/**
 * One library row. The title is the row's button (it opens the editor), so the row is reached and
 * activated from the keyboard without a click handler on the `<tr>`. Year and progress fold under
 * the title below the `sm` breakpoint instead of scrolling the table sideways.
 */
export default function EntryRow({ entry, onOpen }: EntryRowProps) {
  const progress = isMediaKind(entry.kind) ? formatProgress(entry.kind, entry.progress) : "";
  const secondary = [entry.year === null ? "" : String(entry.year), progress]
    .filter(Boolean)
    .join(" · ");

  const completedAt = entry.completedAt ?? (entry.status === "completed" ? entry.statusAt : null);

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
      <td className={CELL_CLASS}>
        <StatusCell entry={entry} />
      </td>
      <td className={cn(CELL_CLASS, NUM_CLASS)}>{entry.rating ?? FAINT}</td>
      <td className={cn(CELL_CLASS, NUM_CLASS, "hidden text-muted sm:table-cell")}>
        <ProgressCell entry={entry} />
      </td>
      <td className={cn(CELL_CLASS, NUM_CLASS, "hidden text-muted md:table-cell")}>
        {dateCell(completedAt)}
      </td>
      <td className={cn(CELL_CLASS, NUM_CLASS, "hidden text-muted lg:table-cell")}>
        {dateCell(entry.startedAt)}
      </td>
      <td className={cn(CELL_CLASS, NUM_CLASS, "hidden text-muted lg:table-cell")}>
        {dateCell(entry.statusAt ?? entry.updatedAt)}
      </td>
    </tr>
  );
}
