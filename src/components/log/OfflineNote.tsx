import { LISTS_COPY } from "@/constants/log/lists-copy";

interface OfflineNoteProps {
  online: boolean;
}

/** The offline line for the lists screens; its live region stays mounted so the change is announced. */
export default function OfflineNote({ online }: OfflineNoteProps) {
  return (
    <div aria-live="polite" role="status">
      {!online && (
        <p className="rounded-card bg-accent-soft px-4 py-2 text-[13px] text-ink">
          {LISTS_COPY.offline}
        </p>
      )}
    </div>
  );
}
