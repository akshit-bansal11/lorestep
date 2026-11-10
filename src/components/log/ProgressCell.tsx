import Blank from "@/components/log/Blank";
import { LIBRARY_COPY } from "@/constants/log/copy";
import type { Entry } from "@/types/log/entry";
import { formatProgress } from "@/utils/log/format-progress";
import { isMediaKind } from "@/utils/log/media-kind";

/** A full bar for a completed title, else the tracked counters, else the placeholder. */
export default function ProgressCell({ entry }: { entry: Entry }) {
  if (entry.status === "completed") {
    return (
      <div className="flex flex-col gap-1">
        <div aria-hidden="true" className="h-1.5 w-20 rounded-full bg-raise">
          <div className="h-full w-full rounded-full bg-status-completed" />
        </div>
        <span className="text-[11px] text-muted">{LIBRARY_COPY.complete}</span>
      </div>
    );
  }
  const text = isMediaKind(entry.kind) ? formatProgress(entry.kind, entry.progress) : "";
  return text === "" ? <Blank /> : <>{text}</>;
}
