"use client";

import ArcChips from "@/components/canon/ArcChips";
import ProgressMeter from "@/components/canon/ProgressMeter";
import { TITLE_CLASS } from "@/constants/canon/ui";
import type { Franchise } from "@/types/canon/canon";
import type { FranchiseStats } from "@/types/canon/stats";
import { cn } from "@/utils/cn";

interface FranchiseHeadProps {
  franchise: Franchise;
  stats: FranchiseStats;
  activeArc: string;
  arcCountFor: (arcId: string) => number;
  onSelectArc: (arcId: string) => void;
}

export default function FranchiseHead({
  franchise,
  stats,
  activeArc,
  arcCountFor,
  onSelectArc,
}: FranchiseHeadProps) {
  const arcs = franchise.arcs ?? [];

  return (
    <div className="anim-rise flex shrink-0 flex-col gap-2.5 border-line border-b px-3 py-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className={cn(TITLE_CLASS, "text-[22px] text-ink")}>{franchise.name}</h1>
        <span className="text-[10px] text-faint tabular-nums">
          {stats.total} games
          {stats.hours > 0 ? ` · ${stats.hours}h` : ""}
        </span>

        {stats.tracked > 0 ? (
          <span className="flex min-w-32 flex-1 items-center gap-2 sm:max-w-56">
            <ProgressMeter
              className="flex-1"
              done={stats.completed}
              label={`${stats.completed} of ${stats.total} completed`}
              total={stats.total}
            />
            <span className="text-[10px] text-faint tabular-nums">
              {stats.completed}/{stats.total} done
            </span>
          </span>
        ) : null}
      </div>

      <p className="max-w-prose text-[12px] text-muted leading-relaxed">{franchise.scope}</p>

      <details className="group max-w-prose">
        <summary
          className={cn(
            "flex cursor-pointer list-none items-center gap-1.5 text-[11px] text-faint",
            "transition-colors duration-[160ms] ease-out hover:text-muted",
            "[&::-webkit-details-marker]:hidden motion-reduce:transition-none",
          )}
        >
          <span
            aria-hidden="true"
            className="text-[9px] transition-transform duration-[160ms] ease-out group-open:rotate-90 motion-reduce:transition-none"
          >
            ▶
          </span>
          How this order was decided
        </summary>
        <p className="anim-rise mt-1.5 border-line border-l pl-2.5 text-[11px] text-faint leading-relaxed">
          {franchise.caveat}
        </p>
      </details>

      {arcs.length > 0 ? (
        <ArcChips activeId={activeArc} arcs={arcs} countFor={arcCountFor} onSelect={onSelectArc} />
      ) : null}
    </div>
  );
}
