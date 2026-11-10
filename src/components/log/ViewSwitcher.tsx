"use client";

import { LIBRARY_COPY } from "@/constants/log/copy";
import { LIBRARY_VIEWS } from "@/constants/log/library";
import type { LibraryView } from "@/types/log/library";
import { cn } from "@/utils/cn";
import { setLibraryView } from "@/utils/log/library-view-store";

/** Cards / List / Table toggle; the choice is kept in this browser. */
export default function ViewSwitcher({ view }: { view: LibraryView }) {
  return (
    <div aria-label={LIBRARY_COPY.viewGroup} className="flex gap-1" role="group">
      {LIBRARY_VIEWS.map((option) => (
        <button
          aria-pressed={view === option.id}
          className={cn(
            "inline-flex h-11 items-center gap-1.5 rounded-control px-3 text-[13px] transition-colors duration-[160ms] motion-reduce:transition-none",
            view === option.id ? "bg-raise text-ink" : "text-muted hover:bg-raise hover:text-ink",
          )}
          key={option.id}
          onClick={() => setLibraryView(option.id)}
          type="button"
        >
          <svg
            aria-hidden="true"
            className="size-4"
            fill="none"
            focusable="false"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d={option.path} />
          </svg>
          {option.label}
        </button>
      ))}
    </div>
  );
}
