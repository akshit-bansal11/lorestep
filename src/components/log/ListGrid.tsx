import Link from "next/link";
import { CARD_CLASS, TITLE_CLASS } from "@/constants/canon/ui";
import { LOG_SECONDARY_CLASS } from "@/constants/log/classes";
import { LISTS_COPY } from "@/constants/log/lists-copy";
import type { ApiFailure } from "@/types/api/api";
import type { List } from "@/types/log/list";
import { cn } from "@/utils/cn";
import { failureMessage } from "@/utils/log/failure-message";
import { countLabel, kindsLabel } from "@/utils/log/list-kinds";

const copy = LISTS_COPY;
const SKELETON_CARDS = ["a", "b", "c"] as const;

interface ListGridProps {
  lists: readonly List[];
  loading: boolean;
  failure: ApiFailure | null;
  onRetry: () => void;
  onNew: () => void;
}

/** The lists as a grid of cards, with every state the load can be in (UX-01). */
export default function ListGrid({ lists, loading, failure, onRetry, onNew }: ListGridProps) {
  if (loading) {
    return (
      <div aria-live="polite" role="status">
        <p className="sr-only">{copy.loading}</p>
        <div aria-hidden="true" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SKELETON_CARDS.map((id) => (
            <div
              className="h-28 animate-pulse rounded-card bg-surface/60 motion-reduce:animate-none"
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

  if (lists.length === 0) {
    return (
      <div className={cn(CARD_CLASS, "flex flex-col items-start gap-3 p-5")}>
        <h2 className="font-medium text-[16px] text-ink">{copy.empty.title}</h2>
        <p className="max-w-prose text-[13px] text-muted">{copy.empty.body}</p>
        <button className={LOG_SECONDARY_CLASS} onClick={onNew} type="button">
          {copy.empty.action}
        </button>
      </div>
    );
  }

  return (
    <ul aria-label={copy.gridLabel} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {lists.map((list) => (
        <li key={list.id}>
          <Link
            className={cn(CARD_CLASS, "flex min-h-28 flex-col gap-1 p-4")}
            href={`/lists/${list.id}`}
          >
            <span className={cn(TITLE_CLASS, "text-[18px] text-ink")}>{list.name}</span>
            <span className="text-[12px] text-muted">
              {countLabel(list.itemCount)} · {kindsLabel(list.kinds)}
            </span>
            {list.description !== "" && (
              <span className="line-clamp-2 text-[12px] text-faint">{list.description}</span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
