"use client";

import { CONTROL_CLASS } from "@/constants/canon/ui";
import { useEntries } from "@/hooks/canon/use-entries";
import { useEntriesSync } from "@/hooks/canon/use-entries-sync";

/**
 * Signed-in only: asks once per account whether to copy this browser's marks in, and says so when
 * marks have not reached the account. The status region stays mounted so its text is announced.
 */
export default function ImportBanner() {
  const { entries } = useEntries();
  const { prompt, failed, busy, decide, dismiss } = useEntriesSync();
  const count = Object.keys(entries).length;

  return (
    <div role="status" aria-live="polite">
      {prompt ? (
        <div className="flex flex-wrap items-center gap-2 border-line border-b bg-surface px-4 py-2 text-[13px] text-ink">
          <p className="mr-auto">
            {failed
              ? "The import did not go through. Your marks are still in this browser. Try again."
              : `Import ${count} ${count === 1 ? "mark" : "marks"} from this browser into your account?`}
          </p>
          <button
            type="button"
            className={CONTROL_CLASS}
            disabled={busy}
            onClick={() => decide("imported")}
          >
            {busy ? "Importing..." : "Import"}
          </button>
          <button type="button" className={CONTROL_CLASS} disabled={busy} onClick={dismiss}>
            Not now
          </button>
          <button
            type="button"
            className={CONTROL_CLASS}
            disabled={busy}
            onClick={() => decide("never")}
          >
            Never
          </button>
        </div>
      ) : failed ? (
        <p className="border-line border-b bg-surface px-4 py-2 text-[13px] text-muted">
          Not synced. Your changes are saved in this browser and are sent to your account the next
          time you open Lorestep signed in.
        </p>
      ) : null}
    </div>
  );
}
