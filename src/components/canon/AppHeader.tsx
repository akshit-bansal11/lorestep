"use client";

import ThemeToggle from "@/components/canon/ThemeToggle";
import { CONTROL_CLASS } from "@/constants/canon/ui";
import { cn } from "@/utils/cn";

interface AppHeaderProps {
  crumb: string;
  onOpenNav: () => void;
  onOpenPalette: () => void;
  onOpenShortcuts: () => void;
  onHome: () => void;
}

export default function AppHeader({
  crumb,
  onOpenNav,
  onOpenPalette,
  onOpenShortcuts,
  onHome,
}: AppHeaderProps) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-line border-b px-2 sm:px-3">
      <button
        aria-label="Show the franchise list"
        className={cn(CONTROL_CLASS, "w-9 px-0 text-center lg:hidden")}
        onClick={onOpenNav}
        type="button"
      >
        <span aria-hidden="true">☰</span>
      </button>

      <button
        className="group flex shrink-0 items-baseline gap-1.5 rounded-control px-1 py-1"
        onClick={onHome}
        type="button"
      >
        <span className="font-medium text-[15px] text-ink tracking-[-0.02em]">Lorestep</span>
        <span className="hidden text-[10px] text-faint uppercase tracking-[0.14em] sm:inline">
          story order
        </span>
      </button>

      {crumb === "" ? null : (
        <>
          <span aria-hidden="true" className="text-faint">
            /
          </span>
          <span className="min-w-0 flex-1 truncate text-[13px] text-muted">{crumb}</span>
        </>
      )}

      <div className={cn("flex items-center gap-1.5", crumb === "" ? "ml-auto" : "")}>
        <button
          className={cn(CONTROL_CLASS, "hidden items-center gap-2 sm:flex")}
          onClick={onOpenPalette}
          type="button"
        >
          <span className="text-muted">Jump to…</span>
          <span className="font-mono text-[10px] text-faint">⌘K</span>
        </button>

        <button
          aria-label="Jump to a franchise or game"
          className={cn(CONTROL_CLASS, "w-9 px-0 text-center sm:hidden")}
          onClick={onOpenPalette}
          type="button"
        >
          <span aria-hidden="true">⌕</span>
        </button>

        <button
          aria-label="Keyboard shortcuts"
          className={cn(CONTROL_CLASS, "hidden w-7 px-0 text-center sm:block")}
          onClick={onOpenShortcuts}
          type="button"
        >
          <span aria-hidden="true">?</span>
        </button>

        <ThemeToggle />
      </div>
    </header>
  );
}
