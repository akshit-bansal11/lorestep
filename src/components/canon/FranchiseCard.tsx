"use client";

import ProgressMeter from "@/components/canon/ProgressMeter";
import { CARD_CLASS } from "@/constants/canon/ui";
import type { Franchise } from "@/types/canon/canon";
import type { FranchiseStats } from "@/types/canon/stats";
import { cn } from "@/utils/cn";

interface FranchiseCardProps {
  franchise: Franchise;
  stats: FranchiseStats;
  index: number;
  onSelect: (franchiseId: string) => void;
}

export default function FranchiseCard({ franchise, stats, index, onSelect }: FranchiseCardProps) {
  const years = franchise.games.map((game) => game.year);
  const first = Math.min(...years);
  const last = Math.max(...years);

  return (
    <button
      className={cn(
        CARD_CLASS,
        "group flex flex-col items-stretch gap-2 p-3 text-left",
        "hover:-translate-y-0.5 hover:border-accent-line hover:shadow-[var(--tone-cast)]",
        "active:translate-y-0 motion-reduce:hover:translate-y-0",
      )}
      onClick={() => onSelect(franchise.id)}
      style={{ "--row-index": index }}
      type="button"
    >
      <span className="flex items-baseline gap-2">
        <span className="flex-1 font-medium text-[14px] text-ink leading-tight tracking-[-0.01em]">
          {franchise.name}
        </span>
        <span
          aria-hidden="true"
          className="text-faint transition-[color,transform] duration-[160ms] ease-out group-hover:translate-x-0.5 group-hover:text-accent motion-reduce:transition-none"
        >
          →
        </span>
      </span>

      <span className="flex flex-wrap items-center gap-x-2 font-mono text-[10px] text-faint tabular-nums">
        <span>{stats.total} games</span>
        <span aria-hidden="true">·</span>
        <span>
          {first}–{last}
        </span>
        {stats.arcs > 0 ? (
          <>
            <span aria-hidden="true">·</span>
            <span className="text-muted">{stats.arcs} storylines</span>
          </>
        ) : null}
        {stats.hours > 0 ? (
          <>
            <span aria-hidden="true">·</span>
            <span>{stats.hours}h</span>
          </>
        ) : null}
      </span>

      <span className="line-clamp-2 text-[11px] text-muted leading-relaxed">{franchise.scope}</span>

      {stats.tracked > 0 ? (
        <span className="flex items-center gap-2">
          <ProgressMeter
            className="flex-1"
            done={stats.completed}
            label={`${franchise.name}: ${stats.completed} of ${stats.total} completed`}
            total={stats.total}
          />
          <span className="font-mono text-[10px] text-faint tabular-nums">
            {stats.completed}/{stats.total}
          </span>
        </span>
      ) : null}
    </button>
  );
}
