import Blank from "@/components/log/Blank";
import StatusChip from "@/components/log/StatusChip";
import { STATUS_LABELS } from "@/constants/log/copy";
import { CANONICAL_STATUSES } from "@/constants/log/statuses";
import type { Entry } from "@/types/log/entry";
import { isMediaKind } from "@/utils/log/media-kind";
import { pick } from "@/utils/log/pick";
import { statusLabel } from "@/utils/log/status-label";

/** The status chip when the label is a canonical one, else the plain label, else a blank. */
export default function StatusCell({ entry }: { entry: Entry }) {
  const status = statusLabel(entry);
  const chipStatus = pick(CANONICAL_STATUSES, entry.status ?? "");
  if (
    isMediaKind(entry.kind) &&
    chipStatus !== null &&
    status === STATUS_LABELS[entry.kind][chipStatus]
  ) {
    return <StatusChip kind={entry.kind} status={chipStatus} />;
  }
  return status === "" ? <Blank /> : <>{status}</>;
}
