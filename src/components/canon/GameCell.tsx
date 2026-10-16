"use client";

import type { Game } from "@/types/canon/canon";
import { cn } from "@/utils/cn";

interface GameCellProps {
  game: Game;
  onOpen: () => void;
}

export default function GameCell({ game, onOpen }: GameCellProps) {
  return (
    <button
      aria-label={`Open details for ${game.title}`}
      className={cn(
        "group/title flex w-full flex-col items-start gap-0.5 rounded-control py-0.5 text-left",
        "transition-colors duration-[160ms] ease-out motion-reduce:transition-none",
      )}
      onClick={onOpen}
      type="button"
    >
      <span className="flex items-baseline gap-1.5">
        <span className="text-ink underline decoration-transparent underline-offset-2 transition-[text-decoration-color] duration-[160ms] group-hover/title:decoration-accent motion-reduce:transition-none">
          {game.title}
        </span>

        {game.starter ? (
          <span className="shrink-0 rounded-control border border-accent-line bg-accent-soft px-1 text-[9px] text-accent uppercase tracking-[0.1em]">
            start
          </span>
        ) : null}

        <span
          aria-hidden="true"
          className="shrink-0 text-[10px] text-faint opacity-0 transition-opacity duration-[160ms] group-hover/title:opacity-100 motion-reduce:transition-none"
        >
          →
        </span>
      </span>

      {game.editions.length > 1 ? (
        <span className="font-mono text-[10px] text-faint tabular-nums">
          {game.editions.length} editions
        </span>
      ) : null}
    </button>
  );
}
