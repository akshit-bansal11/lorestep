import EntryPoster from "@/components/log/EntryPoster";
import ProgressCell from "@/components/log/ProgressCell";
import StatusCell from "@/components/log/StatusCell";
import { NUM_CLASS, TITLE_CLASS } from "@/constants/canon/ui";
import { LIBRARY_COPY } from "@/constants/log/copy";
import type { Entry } from "@/types/log/entry";
import { cn } from "@/utils/cn";
import { formatDate } from "@/utils/log/format-date";

interface EntryListRowProps {
  entry: Entry;
  onOpen: (entry: Entry) => void;
}

/** One list row: thumbnail, title, then year, status, progress and completed date. */
export default function EntryListRow({ entry, onOpen }: EntryListRowProps) {
  const completed = formatDate(
    entry.completedAt ?? (entry.status === "completed" ? entry.statusAt : null),
  );
  return (
    <button
      aria-label={LIBRARY_COPY.open.replace("{title}", entry.title)}
      className="flex min-h-11 w-full items-center gap-3 rounded-card bg-surface p-2 text-left transition-colors duration-[160ms] hover:bg-raise motion-reduce:transition-none"
      onClick={() => onOpen(entry)}
      type="button"
    >
      <EntryPoster className="h-[72px] w-12" entry={entry} textClassName="p-1 text-[10px]" />
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className={cn(TITLE_CLASS, "truncate text-[18px] text-ink")}>{entry.title}</span>
        <span
          className={cn(
            NUM_CLASS,
            "flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted",
          )}
        >
          {entry.year !== null && <span>{entry.year}</span>}
          <StatusCell entry={entry} />
          <ProgressCell entry={entry} />
          {completed !== "" && <span>{completed}</span>}
        </span>
      </span>
    </button>
  );
}
