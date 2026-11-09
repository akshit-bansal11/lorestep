"use client";

import EntryRow from "@/components/log/EntryRow";
import { CARD_CLASS } from "@/constants/canon/ui";
import { LOG_SECONDARY_CLASS, LOG_TH_CLASS } from "@/constants/log/classes";
import { KIND_NAMES, LIBRARY_COPY } from "@/constants/log/copy";
import type { ApiFailure } from "@/types/api/api";
import type { Entry } from "@/types/log/entry";
import type { MediaKind } from "@/types/metadata/metadata";
import { cn } from "@/utils/cn";
import { failureMessage } from "@/utils/log/failure-message";

const SKELETON_ROWS = ["a", "b", "c", "d", "e", "f"] as const;
const copy = LIBRARY_COPY;

interface LibraryTableProps {
  kind: MediaKind;
  items: readonly Entry[];
  loading: boolean;
  /** Why the load failed, or null. */
  failure: ApiFailure | null;
  /** True when a status or search filter is narrowing the list. */
  filtered: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  /** Why the next page failed; the loaded rows stay on screen. */
  moreFailure: ApiFailure | null;
  onOpen: (entry: Entry) => void;
  onAdd: () => void;
  onRetry: () => void;
  onLoadMore: () => void;
  onClearFilters: () => void;
}

/**
 * The library list with every state it can be in (UX-01): a skeleton the size of the rows while
 * loading, a retryable error, a first-run empty state with its one next action, a "no matches"
 * state that clears the filters, the rows, and a partial footer when only the next page failed.
 */
export default function LibraryTable({
  kind,
  items,
  loading,
  failure,
  filtered,
  hasMore,
  loadingMore,
  moreFailure,
  onOpen,
  onAdd,
  onRetry,
  onLoadMore,
  onClearFilters,
}: LibraryTableProps) {
  if (loading) {
    return (
      <div aria-live="polite" role="status">
        <p className="sr-only">{copy.loading}</p>
        <div aria-hidden="true" className="flex flex-col">
          {SKELETON_ROWS.map((id) => (
            <div
              className="h-[58px] animate-pulse border-line border-b bg-surface/60 motion-reduce:animate-none"
              key={id}
            />
          ))}
        </div>
      </div>
    );
  }

  if (failure !== null) {
    return (
      <div className={cn(CARD_CLASS, "flex flex-col items-start gap-3 p-5")} role="alert">
        <h2 className="font-medium text-[16px] text-ink">{copy.error.title}</h2>
        <p className="text-[13px] text-muted">
          {copy.error.body.replace("{reason}", failureMessage(failure))}
        </p>
        <button className={LOG_SECONDARY_CLASS} onClick={onRetry} type="button">
          {copy.retry}
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    const empty = copy.empty;
    return (
      <div className={cn(CARD_CLASS, "flex flex-col items-start gap-3 p-5")}>
        <h2 className="font-medium text-[16px] text-ink">
          {filtered ? empty.filtered : empty.first}
        </h2>
        <p className="max-w-prose text-[13px] text-muted">
          {(filtered ? empty.filteredBody : empty.firstBody).replace("{kind}", KIND_NAMES[kind])}
        </p>
        <button
          className={LOG_SECONDARY_CLASS}
          onClick={filtered ? onClearFilters : onAdd}
          type="button"
        >
          {filtered ? empty.filteredAction : empty.firstAction}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <caption className="sr-only">{copy.tableCaption}</caption>
          <thead>
            <tr>
              <th className={LOG_TH_CLASS} scope="col">
                {copy.columns.title}
              </th>
              <th className={cn(LOG_TH_CLASS, "hidden sm:table-cell")} scope="col">
                {copy.columns.year}
              </th>
              <th className={LOG_TH_CLASS} scope="col">
                {copy.columns.status}
              </th>
              <th className={LOG_TH_CLASS} scope="col">
                {copy.columns.rating}
              </th>
              <th className={cn(LOG_TH_CLASS, "hidden sm:table-cell")} scope="col">
                {copy.columns.progress}
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((entry) => (
              <EntryRow entry={entry} key={entry.id} onOpen={onOpen} />
            ))}
          </tbody>
        </table>
      </div>

      <div aria-live="polite" role="status">
        {loadingMore && <p className="text-[13px] text-muted">{copy.loadingMore}</p>}
      </div>
      {moreFailure !== null && (
        <p className="text-[13px] text-accent" role="alert">
          {copy.moreFailed.replace("{reason}", failureMessage(moreFailure))}
        </p>
      )}
      {hasMore && (
        <button
          className={cn(LOG_SECONDARY_CLASS, "self-start")}
          disabled={loadingMore}
          onClick={onLoadMore}
          type="button"
        >
          {moreFailure === null ? copy.loadMore : copy.retry}
        </button>
      )}
    </div>
  );
}
