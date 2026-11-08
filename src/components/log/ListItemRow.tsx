import { LOG_SECONDARY_CLASS } from "@/constants/log/classes";
import { KIND_NAMES } from "@/constants/log/copy";
import { LISTS_COPY } from "@/constants/log/lists-copy";
import type { ListItem } from "@/types/log/list";
import { cn } from "@/utils/cn";
import { isMediaKind } from "@/utils/log/media-kind";

const copy = LISTS_COPY.item;
const BUTTON_CLASS = cn(
  LOG_SECONDARY_CLASS,
  "aria-disabled:pointer-events-none aria-disabled:opacity-60",
);

interface ListItemRowProps {
  item: ListItem;
  index: number;
  total: number;
  /** A write is in flight: the buttons stay focusable (aria-disabled) and the page ignores them. */
  busy: boolean;
  onMove: (index: number, delta: -1 | 1) => void;
  onRemove: (item: ListItem) => void;
}

/** The DOM id of a row's move button, so focus can follow the row after it moves. */
export function moveButtonId(itemId: string, delta: -1 | 1): string {
  return `list-item-${itemId}-${delta === -1 ? "up" : "down"}`;
}

/**
 * One ordered title with Move up, Move down and Remove. Reordering is buttons, not drag, so it is
 * as available from a keyboard or a screen reader as from a pointer. Each button's name is its
 * visible words followed by the title, so the names stay distinct and contain their visible text.
 */
export default function ListItemRow({
  item,
  index,
  total,
  busy,
  onMove,
  onRemove,
}: ListItemRowProps) {
  const kind = isMediaKind(item.kind) ? KIND_NAMES[item.kind] : item.kind;
  const meta = [kind, item.year === null ? "" : String(item.year)].filter(Boolean).join(" · ");

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 border-line border-b py-2">
      <span aria-hidden="true" className="w-6 text-right text-[12px] text-faint tabular-nums">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1 basis-40">
        <p className="text-[13px] text-ink">{item.title}</p>
        <p className="text-[11px] text-muted">{meta}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          aria-disabled={busy}
          className={BUTTON_CLASS}
          disabled={index === 0}
          id={moveButtonId(item.id, -1)}
          onClick={() => onMove(index, -1)}
          type="button"
        >
          {copy.up}
          <span className="sr-only"> {item.title}</span>
        </button>
        <button
          aria-disabled={busy}
          className={BUTTON_CLASS}
          disabled={index === total - 1}
          id={moveButtonId(item.id, 1)}
          onClick={() => onMove(index, 1)}
          type="button"
        >
          {copy.down}
          <span className="sr-only"> {item.title}</span>
        </button>
        <button
          aria-disabled={busy}
          className={BUTTON_CLASS}
          onClick={() => onRemove(item)}
          type="button"
        >
          {copy.remove}
          <span className="sr-only"> {item.title}</span>
        </button>
      </div>
    </li>
  );
}
