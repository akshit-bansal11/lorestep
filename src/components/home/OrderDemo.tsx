"use client";

import { useState } from "react";
import { TIER_LABEL } from "@/constants/canon/tiers";
import { NUM_CLASS, TITLE_CLASS } from "@/constants/canon/ui";
import { DEMO_NOTE } from "@/constants/home/copy";
import {
  DEMO_FOOT,
  DEMO_FRANCHISE_GROUP_LABEL,
  DEMO_NOTE_FRANCHISE_ID,
  DEMO_ORDER_GROUP_LABEL,
  DEMO_ORDER_LABEL,
  DEMO_ORDER_OPTIONS,
  DEMO_ROW_HEIGHT,
  DEMO_STATUS,
  DEMO_TOGGLE_CLASS,
} from "@/constants/home/order-demo";
import { useMounted } from "@/hooks/home/use-mounted";
import type { DemoOrder, OrderDemoProps } from "@/types/home/order-demo-props";
import { cn } from "@/utils/cn";
import { releaseRank } from "@/utils/home/order-demo";

/**
 * Story/release switch. The DOM stays in story order and each row moves by transform, so the
 * server render (and a visitor without JS) gets the first franchise in story order, no controls.
 */
export default function OrderDemo({ franchises, className }: OrderDemoProps) {
  const mounted = useMounted();
  const [franchiseId, setFranchiseId] = useState(franchises[0]?.id);
  const [order, setOrder] = useState<DemoOrder>("story");

  const franchise = franchises.find((candidate) => candidate.id === franchiseId) ?? franchises[0];
  if (franchise === undefined) return null;

  const sorted = order === "release" ? releaseRank(franchise.rows) : franchise.rows;
  const rankOf = new Map(sorted.map((row, rank) => [row.id, rank]));
  const size = franchise.rows.length;

  return (
    <div className={cn("min-w-0 rounded-overlay bg-surface p-[clamp(18px,2vw,28px)]", className)}>
      {mounted ? (
        <fieldset
          aria-label={DEMO_FRANCHISE_GROUP_LABEL}
          className="m-0 flex min-w-0 flex-wrap gap-1.5 border-0 p-0"
        >
          {franchises.map((candidate) => (
            <button
              key={candidate.id}
              type="button"
              aria-pressed={candidate.id === franchise.id}
              onClick={() => setFranchiseId(candidate.id)}
              className={cn(DEMO_TOGGLE_CLASS, "bg-raise")}
            >
              {candidate.name}
            </button>
          ))}
        </fieldset>
      ) : null}

      <div className="mt-5 mb-3.5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={cn(TITLE_CLASS, "text-[clamp(26px,2.4vw,38px)] text-ink")}>
            {franchise.name}
          </p>
          <p role="status" className="mt-1.5 text-[15px] text-muted">
            {DEMO_STATUS[order]}
          </p>
        </div>
        {mounted ? (
          <fieldset
            aria-label={DEMO_ORDER_GROUP_LABEL}
            className="m-0 inline-flex min-w-0 rounded-full border-0 bg-canvas p-1"
          >
            {DEMO_ORDER_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={option === order}
                onClick={() => setOrder(option)}
                className={DEMO_TOGGLE_CLASS}
              >
                {DEMO_ORDER_LABEL[option]}
              </button>
            ))}
          </fieldset>
        ) : null}
      </div>

      <ol className="relative" style={{ height: size * DEMO_ROW_HEIGHT }}>
        {franchise.rows.map((row) => {
          const rank = rankOf.get(row.id) ?? 0;
          return (
            <li
              key={row.id}
              aria-posinset={rank + 1}
              aria-setsize={size}
              className="absolute inset-x-0 top-0 grid h-[54px] grid-cols-[28px_minmax(0,1fr)_48px] items-center gap-2.5 px-2 sm:grid-cols-[38px_minmax(0,1fr)_64px_92px] sm:gap-3.5 sm:px-3.5 transition-transform duration-(--dur-4) ease-out"
              style={{ transform: `translateY(${rank * DEMO_ROW_HEIGHT}px)` }}
            >
              <span className={cn(NUM_CLASS, "text-right text-[15px] text-muted")}>{rank + 1}</span>
              <span className={cn(TITLE_CLASS, "truncate text-[17px] text-ink")}>{row.title}</span>
              <span className={cn(NUM_CLASS, "text-[15px] text-muted")}>{row.year}</span>
              <span className="hidden h-7 items-center justify-self-end whitespace-nowrap rounded-full bg-raise sm:inline-flex px-3 font-semibold text-[13px] text-muted">
                {TIER_LABEL[row.tier]}
              </span>
            </li>
          );
        })}
      </ol>

      {franchise.id === DEMO_NOTE_FRANCHISE_ID ? (
        <p className="mt-3.5 text-[14px] text-muted">{DEMO_NOTE}</p>
      ) : null}
      <p className="mt-2 text-[14px] text-muted">{DEMO_FOOT}</p>
    </div>
  );
}
