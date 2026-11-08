"use client";

import { useState } from "react";
import KindTabs from "@/components/log/KindTabs";
import { LOG_CONTROL_CLASS, LOG_LABEL_CLASS, LOG_SECONDARY_CLASS } from "@/constants/log/classes";
import { LISTS_COPY } from "@/constants/log/lists-copy";
import { useLibrary } from "@/hooks/log/use-library";
import type { ApiResult } from "@/types/api/api";
import type { Entry } from "@/types/log/entry";
import type { ListItem, ListItemCreate } from "@/types/log/list";
import { cn } from "@/utils/cn";
import { failureMessage } from "@/utils/log/failure-message";
import { filterEntriesByTitle, isInList, listItemFromEntry } from "@/utils/log/list-library-pick";

const copy = LISTS_COPY.addDialog;

interface ListLibraryPickerProps {
  /** What the list holds now, so those entries show as added. */
  existing: readonly ListItem[];
  onAdd: (item: ListItemCreate) => Promise<ApiResult<ListItem>>;
}

/** Pick titles from the user's own library: one type at a time, filtered by title as you type. */
export default function ListLibraryPicker({ existing, onAdd }: ListLibraryPickerProps) {
  const library = useLibrary();
  const [term, setTerm] = useState("");
  const [adding, setAdding] = useState<string | null>(null);
  const [added, setAdded] = useState("");
  const [failure, setFailure] = useState("");
  const shown = filterEntriesByTitle(library.items, term);

  async function add(entry: Entry) {
    const body = listItemFromEntry(entry);
    if (body === null) return;
    setAdding(entry.id);
    setAdded("");
    setFailure("");
    const created = await onAdd(body);
    setAdding(null);
    if (!created.ok) {
      setFailure(failureMessage(created.failure));
      return;
    }
    setAdded(LISTS_COPY.addDialog.added.replace("{title}", entry.title));
  }

  return (
    <div className="flex flex-col gap-4">
      <KindTabs onChange={library.setKind} value={library.filters.kind} />
      <label className={cn(LOG_LABEL_CLASS, "w-full")}>
        {copy.libraryFilter}
        <input
          autoComplete="off"
          className={cn(LOG_CONTROL_CLASS, "w-full")}
          onChange={(event) => setTerm(event.target.value)}
          type="search"
          value={term}
        />
      </label>

      <div aria-live="polite" role="status">
        {library.loading && <p className="text-[13px] text-muted">{copy.libraryLoading}</p>}
        {library.more.loading && (
          <p className="text-[13px] text-muted">{copy.libraryMoreLoading}</p>
        )}
        {added !== "" && <p className="text-[13px] text-ink">{added}</p>}
      </div>

      <div role="alert">
        {failure !== "" && <p className="text-[13px] text-accent">{failure}</p>}
        {library.failure !== null && (
          <div className="flex flex-col items-start gap-2">
            <p className="text-[13px] text-accent">{failureMessage(library.failure)}</p>
            <button className={LOG_SECONDARY_CLASS} onClick={library.reload} type="button">
              {LISTS_COPY.retry}
            </button>
          </div>
        )}
      </div>

      {!library.loading && library.failure === null && library.items.length === 0 && (
        <p className="text-[13px] text-muted">{copy.libraryEmpty}</p>
      )}
      {library.items.length > 0 && shown.length === 0 && (
        <p className="text-[13px] text-muted">
          {copy.libraryNone.replace("{q}", `"${term.trim()}"`)}
        </p>
      )}

      {shown.length > 0 && (
        <ul aria-label={copy.libraryResults} className="flex flex-col divide-y divide-line">
          {shown.map((entry) => {
            const inList = isInList(entry, existing);
            return (
              <li key={entry.id}>
                <button
                  className="flex min-h-11 w-full flex-col items-start justify-center rounded-control px-1 py-2 text-left transition-colors duration-[160ms] hover:bg-surface disabled:opacity-60 motion-reduce:transition-none"
                  disabled={inList || adding !== null}
                  onClick={() => add(entry)}
                  type="button"
                >
                  <span className="text-[13px] text-ink">{entry.title}</span>
                  <span className="text-[11px] text-muted">
                    {[entry.year === null ? "" : String(entry.year), inList ? copy.inList : ""]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  <span className="sr-only">{copy.pick.replace("{title}", entry.title)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {library.hasMore && (
        <button
          className={LOG_SECONDARY_CLASS}
          disabled={library.more.loading}
          onClick={library.loadMore}
          type="button"
        >
          {copy.libraryMore}
        </button>
      )}
    </div>
  );
}
