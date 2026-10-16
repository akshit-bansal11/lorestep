"use client";

import type { Column, SortKey, SortState } from "@/types/canon/table";
import { cn } from "@/utils/cn";

interface SortableHeaderProps {
  column: Column;
  sort: SortState;
  onSort: (key: SortKey) => void;
}

export default function SortableHeader({ column, sort, onSort }: SortableHeaderProps) {
  const { key } = column;
  const active = key !== null && key === sort.key;

  return (
    <th
      aria-sort={active ? (sort.direction === 1 ? "ascending" : "descending") : "none"}
      className={cn(
        "sticky top-0 whitespace-nowrap border-edge border-b bg-canvas px-2 py-2 text-left font-medium text-[10px] text-muted uppercase tracking-[0.12em]",
        column.sticky === true ? "left-0 z-20" : "z-10",
        column.className,
      )}
      scope="col"
    >
      {key === null ? (
        column.label
      ) : (
        <button
          className={cn(
            "inline-flex items-center gap-1 uppercase tracking-[0.12em]",
            active ? "text-ink" : "hover:text-ink",
          )}
          onClick={() => onSort(key)}
          type="button"
        >
          {column.label}
          <span aria-hidden="true" className={cn("text-[8px] text-accent", !active && "opacity-0")}>
            {sort.direction === 1 ? "▲" : "▼"}
          </span>
        </button>
      )}
    </th>
  );
}
