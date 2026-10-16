"use client";

import type { Arc } from "@/types/canon/canon";
import { cn } from "@/utils/cn";

interface ArcChipsProps {
  arcs: readonly Arc[];
  activeId: string;
  countFor: (arcId: string) => number;
  onSelect: (arcId: string) => void;
}

export default function ArcChips({ arcs, activeId, countFor, onSelect }: ArcChipsProps) {
  const chip = (id: string, label: string, count: number) => {
    const active = activeId === id;
    return (
      <button
        aria-pressed={active}
        className={cn(
          "group flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1",
          "text-[11px] transition-[color,border-color,background-color,transform] duration-[160ms] ease-out",
          "active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100",
          active
            ? "border-accent bg-accent text-accent-ink"
            : "border-line text-muted hover:border-accent-line hover:text-ink",
        )}
        key={id}
        onClick={() => onSelect(id)}
        type="button"
      >
        {label}
        <span className={cn("font-mono text-[10px] tabular-nums", active ? "" : "text-faint")}>
          {count}
        </span>
      </button>
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="pr-1 text-[10px] text-faint uppercase tracking-[0.14em]">Storylines</span>
      {chip(
        "",
        "All",
        arcs.reduce((sum, arc) => sum + countFor(arc.id), 0),
      )}
      {arcs.map((arc) => chip(arc.id, arc.name, countFor(arc.id)))}
    </div>
  );
}
