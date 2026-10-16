"use client";

import type { RefObject } from "react";
import ProgressMeter from "@/components/canon/ProgressMeter";
import { ALL_FRANCHISES } from "@/constants/canon/views";
import type { Franchise } from "@/types/canon/canon";
import type { UserEntries } from "@/types/canon/user";
import { statsFor } from "@/utils/canon/franchise-stats";
import { matchesFranchise } from "@/utils/canon/search-hits";
import { cn } from "@/utils/cn";

interface FranchiseSidebarProps {
  franchises: readonly Franchise[];
  activeId: string;
  gridActive: boolean;
  totalCount: number;
  query: string;
  userEntries: UserEntries;
  inputRef: RefObject<HTMLInputElement | null>;
  onQueryChange: (query: string) => void;
  onSelect: (franchiseId: string) => void;
  onShowGrid: () => void;
}

export default function FranchiseSidebar({
  franchises,
  activeId,
  gridActive,
  totalCount,
  query,
  userEntries,
  inputRef,
  onQueryChange,
  onSelect,
  onShowGrid,
}: FranchiseSidebarProps) {
  const needle = query.trim().toLowerCase();
  const shown = franchises.filter((franchise) => matchesFranchise(franchise, needle));

  const rowClass = (active: boolean) =>
    cn(
      "flex w-full items-center gap-2 rounded-control px-2 py-1.5 text-left",
      "transition-[color,background-color] duration-[160ms] ease-out motion-reduce:transition-none",
      active ? "bg-accent-soft text-ink" : "text-muted hover:bg-surface hover:text-ink",
    );

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-line border-b p-2">
        <input
          aria-label="Filter franchises"
          className={cn(
            "h-8 w-full rounded-control border border-line bg-surface px-2",
            "text-[12px] text-ink placeholder:text-faint",
            "transition-colors duration-[160ms] ease-out hover:border-edge focus-visible:border-edge",
            "motion-reduce:transition-none",
          )}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Filter franchises  /"
          ref={inputRef}
          type="search"
          value={query}
        />
      </div>

      <nav aria-label="Franchises" className="min-h-0 flex-1 overflow-y-auto p-1.5">
        <button className={rowClass(gridActive)} onClick={onShowGrid} type="button">
          <span className="flex-1 truncate">All franchises</span>
          <span className="font-mono text-[10px] text-faint tabular-nums">{franchises.length}</span>
        </button>

        <button
          className={rowClass(!gridActive && activeId === ALL_FRANCHISES)}
          onClick={() => onSelect(ALL_FRANCHISES)}
          type="button"
        >
          <span className="flex-1 truncate">Every game</span>
          <span className="font-mono text-[10px] text-faint tabular-nums">{totalCount}</span>
        </button>

        <div className="my-1.5 border-line border-t" />

        {shown.length === 0 ? (
          <p className="px-2 py-4 text-[11px] text-faint">No franchise matches “{query}”.</p>
        ) : (
          shown.map((franchise) => {
            const stats = statsFor(franchise, userEntries);
            const active = !gridActive && franchise.id === activeId;
            return (
              <button
                className={cn(rowClass(active), "flex-col items-stretch gap-1")}
                key={franchise.id}
                onClick={() => onSelect(franchise.id)}
                type="button"
              >
                <span className="flex items-center gap-2">
                  <span className="flex-1 truncate">{franchise.name}</span>
                  {stats.arcs > 0 ? (
                    <span
                      className="text-[9px] text-faint uppercase tracking-[0.1em]"
                      title={`${stats.arcs} storylines`}
                    >
                      {stats.arcs} arcs
                    </span>
                  ) : null}
                  <span className="font-mono text-[10px] text-faint tabular-nums">
                    {stats.total}
                  </span>
                </span>
                {stats.completed > 0 ? (
                  <ProgressMeter
                    done={stats.completed}
                    label={`${franchise.name}: ${stats.completed} of ${stats.total} completed`}
                    total={stats.total}
                  />
                ) : null}
              </button>
            );
          })
        )}
      </nav>
    </div>
  );
}
