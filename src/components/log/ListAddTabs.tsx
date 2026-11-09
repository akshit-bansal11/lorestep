"use client";

import type { KeyboardEvent } from "react";
import { LISTS_COPY } from "@/constants/log/lists-copy";
import type { ListAddMode } from "@/types/log/list";
import { cn } from "@/utils/cn";

const copy = LISTS_COPY.addDialog;

const TABS: readonly { id: ListAddMode; label: string }[] = [
  { id: "search", label: copy.searchTab },
  { id: "library", label: copy.libraryTab },
];

export const addTabId = (mode: ListAddMode) => `list-add-tab-${mode}`;
export const addPanelId = (mode: ListAddMode) => `list-add-panel-${mode}`;

interface ListAddTabsProps {
  value: ListAddMode;
  onChange: (mode: ListAddMode) => void;
}

/**
 * ARIA tabs (WAI-ARIA APG): the arrows, Home and End move between tabs and select them, and only
 * the selected tab is in the Tab order. The panels are real tabpanels, since they swap content.
 */
export default function ListAddTabs({ value, onChange }: ListAddTabsProps) {
  function onKeyDown(event: KeyboardEvent, index: number) {
    const last = TABS.length - 1;
    const keys: Record<string, number> = {
      ArrowRight: index === last ? 0 : index + 1,
      ArrowLeft: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    };
    const target = TABS[keys[event.key] ?? -1];
    if (target === undefined) return;
    event.preventDefault();
    onChange(target.id);
    document.getElementById(addTabId(target.id))?.focus();
  }

  return (
    <div aria-label={copy.tabsLabel} className="flex gap-1 border-line border-b" role="tablist">
      {TABS.map((tab, index) => {
        const selected = tab.id === value;
        return (
          <button
            aria-controls={addPanelId(tab.id)}
            aria-selected={selected}
            className={cn(
              "inline-flex h-11 items-center px-3 text-[13px] transition-colors duration-[160ms] motion-reduce:transition-none",
              selected ? "border-accent border-b-2 text-ink" : "text-muted hover:text-ink",
            )}
            id={addTabId(tab.id)}
            key={tab.id}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
            role="tab"
            tabIndex={selected ? 0 : -1}
            type="button"
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
