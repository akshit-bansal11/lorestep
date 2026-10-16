"use client";

import { useMemo } from "react";
import FranchiseCard from "@/components/canon/FranchiseCard";
import { CHUNK_SIZE, STAGGER_LIMIT } from "@/constants/canon/motion";
import { useChunked } from "@/hooks/canon/use-chunked";
import type { Franchise } from "@/types/canon/canon";
import type { UserEntries } from "@/types/canon/user";
import { statsFor } from "@/utils/canon/franchise-stats";
import { matchesFranchise } from "@/utils/canon/search-hits";
import { cn } from "@/utils/cn";

interface FranchiseGridProps {
  franchises: readonly Franchise[];
  query: string;
  userEntries: UserEntries;
  onQueryChange: (query: string) => void;
  onSelect: (franchiseId: string) => void;
}

export default function FranchiseGrid({
  franchises,
  query,
  userEntries,
  onQueryChange,
  onSelect,
}: FranchiseGridProps) {
  const needle = query.trim().toLowerCase();

  // Memoised because useChunked resets on a new array identity: an unmemoised
  // filter would hand it a fresh array every render and loop forever.
  const matched = useMemo(
    () => franchises.filter((franchise) => matchesFranchise(franchise, needle)),
    [franchises, needle],
  );

  const [shown, loading] = useChunked(matched, CHUNK_SIZE);

  const games = franchises.reduce((sum, franchise) => sum + franchise.games.length, 0);

  return (
    <div className="h-full overflow-y-auto">
      <div className="anim-lift flex flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 2xl:px-10">
        <header className="flex flex-col gap-3">
          <h1 className="font-medium text-[22px] text-ink leading-tight tracking-[-0.02em] sm:text-[26px]">
            Every franchise, in story order
          </h1>
          <p className="max-w-prose text-[13px] text-muted leading-relaxed">
            {franchises.length} connected series and {games} games, each sorted by in-universe
            chronology rather than release date. Series that split into separate storylines are
            broken out into their own sections. Pick one to start tracking.
          </p>
          <input
            aria-label="Search franchises"
            className={cn(
              "h-10 w-full max-w-md rounded-control border border-line bg-surface px-3",
              "text-[13px] text-ink placeholder:text-faint",
              "transition-colors duration-[160ms] ease-out hover:border-edge focus-visible:border-edge",
              "motion-reduce:transition-none",
            )}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search franchises and games"
            type="search"
            value={query}
          />
        </header>

        {matched.length === 0 ? (
          <p className="py-16 text-center text-[13px] text-faint">
            Nothing matches “{query}”. Try a game title instead of a series name.
          </p>
        ) : (
          <div className="stagger grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {shown.map((franchise, index) => (
              <FranchiseCard
                franchise={franchise}
                index={Math.min(index, STAGGER_LIMIT)}
                key={franchise.id}
                onSelect={onSelect}
                stats={statsFor(franchise, userEntries)}
              />
            ))}
          </div>
        )}

        <p aria-live="polite" className="text-[11px] text-faint">
          {loading ? "Loading more…" : `${matched.length} shown`}
        </p>
      </div>
    </div>
  );
}
