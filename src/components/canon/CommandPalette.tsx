"use client";

import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import Backdrop from "@/components/canon/Backdrop";
import type { Franchise } from "@/types/canon/canon";
import type { SearchHit } from "@/types/canon/search";
import { searchHits } from "@/utils/canon/search-hits";
import { cn } from "@/utils/cn";

const LIMIT = 12;

interface CommandPaletteProps {
  franchises: readonly Franchise[];
  onClose: () => void;
  onPick: (hit: SearchHit) => void;
}

export default function CommandPalette({ franchises, onClose, onPick }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const hits = searchHits(query, franchises, LIMIT);
  const active = Math.min(cursor, Math.max(hits.length - 1, 0));
  const current = hits[active];

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const move = (delta: number) => {
    if (hits.length === 0) return;
    setCursor((current) => (current + delta + hits.length) % hits.length);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      move(1);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      move(-1);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (current !== undefined) onPick(current);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]">
      <Backdrop label="Close the jump-to palette" onClose={onClose} />

      <div
        aria-label="Jump to a franchise or game"
        aria-modal="true"
        className={cn(
          "anim-lift relative flex w-full max-w-lg flex-col overflow-hidden",
          "rounded-overlay border border-edge bg-canvas shadow-[var(--tone-cast)]",
        )}
        role="dialog"
      >
        <input
          aria-describedby="palette-count"
          aria-label="Search franchises and games"
          className="h-12 w-full border-line border-b bg-transparent px-4 text-[14px] text-ink outline-none placeholder:text-faint"
          onChange={(event) => {
            setQuery(event.target.value);
            setCursor(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="Jump to a franchise or game…"
          ref={inputRef}
          type="text"
          value={query}
        />

        <ul className="max-h-80 overflow-y-auto p-1.5">
          {hits.length === 0 ? (
            <li className="px-3 py-6 text-center text-[12px] text-faint">
              {query.trim() === "" ? "Start typing a series or game title." : "Nothing matches."}
            </li>
          ) : (
            hits.map((hit, index) => (
              <li key={`${hit.kind}-${hit.id}`}>
                <button
                  aria-current={index === active}
                  className={cn(
                    "flex w-full items-baseline gap-2 rounded-control px-2.5 py-2 text-left",
                    "transition-colors duration-[90ms] ease-out motion-reduce:transition-none",
                    index === active ? "bg-accent-soft text-ink" : "text-muted hover:bg-surface",
                  )}
                  onClick={() => onPick(hit)}
                  onMouseEnter={() => setCursor(index)}
                  type="button"
                >
                  <span className="w-14 shrink-0 text-[9px] text-faint uppercase tracking-[0.12em]">
                    {hit.kind === "franchise" ? "Series" : "Game"}
                  </span>
                  <span className="flex-1 truncate text-[13px] text-ink">{hit.label}</span>
                  <span className="shrink-0 font-mono text-[10px] text-faint tabular-nums">
                    {hit.sub}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>

        <p
          aria-live="polite"
          className="border-line border-t px-3 py-1.5 text-[10px] text-faint"
          id="palette-count"
        >
          {hits.length === 0 ? "No matches" : `${hits.length} matches`} · ↑↓ to move · Enter to open
          · Esc to close
        </p>
      </div>
    </div>
  );
}
