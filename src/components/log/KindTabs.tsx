"use client";

import { LIBRARY_COPY } from "@/constants/log/copy";
import { KIND_TABS } from "@/constants/log/library";
import type { MediaKind } from "@/types/metadata/metadata";
import { cn } from "@/utils/cn";

interface KindTabsProps {
  value: MediaKind;
  onChange: (kind: MediaKind) => void;
}

/**
 * The media-type filter. Toggle buttons in a fieldset rather than ARIA tabs: it filters one
 * list, it does not swap panels, so Tab moves between buttons and `aria-pressed` carries state.
 */
export default function KindTabs({ value, onChange }: KindTabsProps) {
  return (
    <fieldset className="-mx-1 m-0 flex min-w-0 items-center gap-0.5 overflow-x-auto border-0 px-1 py-0">
      <legend className="sr-only">{LIBRARY_COPY.kindGroup}</legend>
      {KIND_TABS.map((tab) => (
        <button
          aria-pressed={tab.id === value}
          className={cn(
            "inline-flex h-11 shrink-0 items-center rounded-full px-4 text-[13px] transition-colors duration-[160ms] motion-reduce:transition-none",
            tab.id === value
              ? "bg-accent-soft text-ink"
              : "text-muted hover:bg-raise hover:text-ink",
          )}
          key={tab.id}
          onClick={() => onChange(tab.id)}
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </fieldset>
  );
}
