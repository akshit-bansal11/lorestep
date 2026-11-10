import EntryPoster from "@/components/log/EntryPoster";
import ProgressCell from "@/components/log/ProgressCell";
import StatusCell from "@/components/log/StatusCell";
import { NUM_CLASS, TITLE_CLASS } from "@/constants/canon/ui";
import { LIBRARY_COPY } from "@/constants/log/copy";
import type { Entry } from "@/types/log/entry";
import { cn } from "@/utils/cn";

interface EntryCardProps {
  entry: Entry;
  onOpen: (entry: Entry) => void;
}

/** One poster card; the whole card is the button that opens the editor. */
export default function EntryCard({ entry, onOpen }: EntryCardProps) {
  return (
    <button
      aria-label={LIBRARY_COPY.open.replace("{title}", entry.title)}
      className="flex min-h-11 w-full flex-col items-start gap-2 rounded-card bg-surface p-2 text-left transition-colors duration-[160ms] hover:bg-raise motion-reduce:transition-none"
      onClick={() => onOpen(entry)}
      type="button"
    >
      <EntryPoster className="w-full" entry={entry} textClassName="text-lg" />
      <span className={cn(TITLE_CLASS, "line-clamp-2 text-[15px] text-ink leading-tight")}>
        {entry.title}
      </span>
      {entry.year !== null && (
        <span className={cn(NUM_CLASS, "text-[11px] text-muted")}>{entry.year}</span>
      )}
      <StatusCell entry={entry} />
      <span className={cn(NUM_CLASS, "text-[11px] text-muted")}>
        <ProgressCell entry={entry} />
      </span>
    </button>
  );
}
