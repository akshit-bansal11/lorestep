"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CONTROL_CLASS } from "@/constants/canon/ui";
import type { PriceStatus } from "@/types/canon/price";
import { cn } from "@/utils/cn";

const UPDATE_HINT_ID = "update-data-hint";

interface ToolbarActionsProps {
  shown: number;
  total: number;
  tracked: number;
  priceStatus: PriceStatus;
  priceMessage: string;
  filtersActive: boolean;
  onRefreshPrices: () => void;
  onCopyCsv: () => Promise<boolean>;
  onResetFilters: () => void;
  onClearEntries: () => void;
}

export default function ToolbarActions({
  shown,
  total,
  tracked,
  priceStatus,
  priceMessage,
  filtersActive,
  onRefreshPrices,
  onCopyCsv,
  onResetFilters,
  onClearEntries,
}: ToolbarActionsProps) {
  const [copied, setCopied] = useState(false);
  const [armed, setArmed] = useState(false);
  const [hint, setHint] = useState<{ top: number; left: number } | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(
    () => () => {
      for (const timer of timers.current) clearTimeout(timer);
      timers.current = [];
    },
    [],
  );

  const later = useCallback((run: () => void, ms: number) => {
    timers.current.push(setTimeout(run, ms));
  }, []);

  const showHint = (event: { currentTarget: HTMLElement }) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setHint({ top: Math.round(rect.bottom + 6), left: Math.round(rect.left) });
  };

  const hideHint = () => setHint(null);

  const copy = () => {
    void onCopyCsv().then((ok) => {
      setCopied(ok);
      later(() => setCopied(false), 1600);
    });
  };

  // Armed only counts while there is something to wipe, so the confirm state
  // can never strand on a button that has gone disabled underneath it.
  const showArmed = armed && tracked > 0;

  const clear = () => {
    if (!showArmed) {
      setArmed(true);
      later(() => setArmed(false), 3000);
      return;
    }
    setArmed(false);
    onClearEntries();
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="px-1 text-[11px] text-faint tabular-nums whitespace-nowrap">
        {shown === total ? total : `${shown}/${total}`} rows · {tracked} tracked
      </span>

      <button
        aria-describedby={UPDATE_HINT_ID}
        className={cn(CONTROL_CLASS, "whitespace-nowrap")}
        disabled={priceStatus === "loading"}
        onBlur={hideHint}
        onClick={onRefreshPrices}
        onFocus={showHint}
        onMouseEnter={showHint}
        onMouseLeave={hideHint}
        type="button"
      >
        {priceStatus === "loading" ? "Fetching…" : "Update data"}
      </button>

      {/*
        Positioned rather than absolute: the toolbar sits inside a column of
        clipped, scrolling panes, and an absolutely positioned tip is cut off by
        the nearest one. Fixed escapes that, at the cost of measuring the
        coordinates — which is why they are inline and not Tailwind classes.
        Rendered unconditionally so `aria-describedby` always resolves for
        screen readers, whether or not the tip is on screen.
      */}
      <span
        className={cn(
          "pointer-events-none fixed z-50 w-max max-w-64",
          "rounded-[3px] border border-edge bg-surface px-2 py-1",
          "text-[11px] text-muted transition-opacity motion-reduce:transition-none",
          hint === null ? "opacity-0" : "opacity-100",
        )}
        id={UPDATE_HINT_ID}
        role="tooltip"
        style={hint ?? undefined}
      >
        Click to fetch latest accurate data
      </span>

      {priceMessage === "" ? null : (
        <span
          className={cn(
            "max-w-64 truncate px-1 text-[11px]",
            priceStatus === "error" ? "text-ink" : "text-faint",
          )}
          title={priceMessage}
        >
          {priceMessage}
        </span>
      )}

      <button className={cn(CONTROL_CLASS, "whitespace-nowrap")} onClick={copy} type="button">
        {copied ? "Copied" : "Copy CSV"}
      </button>

      <button
        className={cn(CONTROL_CLASS, "whitespace-nowrap")}
        disabled={!filtersActive}
        onClick={onResetFilters}
        type="button"
      >
        Reset filters
      </button>

      <button
        className={cn(CONTROL_CLASS, "whitespace-nowrap")}
        disabled={tracked === 0}
        onClick={clear}
        type="button"
      >
        {showArmed ? "Confirm wipe" : "Clear tracking"}
      </button>

      <span aria-live="polite" className="sr-only">
        {showArmed ? "Clear tracking armed. Activate again to wipe every tracked game." : ""}
      </span>
    </div>
  );
}
