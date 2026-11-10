"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ImportBanner from "@/components/auth/ImportBanner";
import AppHeader from "@/components/canon/AppHeader";
import Backdrop from "@/components/canon/Backdrop";
import CanonTable from "@/components/canon/CanonTable";
import CommandPalette from "@/components/canon/CommandPalette";
import FilterControls from "@/components/canon/FilterControls";
import FranchiseGrid from "@/components/canon/FranchiseGrid";
import FranchiseHead from "@/components/canon/FranchiseHead";
import FranchiseSidebar from "@/components/canon/FranchiseSidebar";
import GameDetail from "@/components/canon/GameDetail";
import ShortcutsDialog from "@/components/canon/ShortcutsDialog";
import ToolbarActions from "@/components/canon/ToolbarActions";
import { EMPTY_FILTER } from "@/constants/canon/filters";
import { ALL_FRANCHISES } from "@/constants/canon/views";
import { useEntries } from "@/hooks/canon/use-entries";
import { useHotkeys } from "@/hooks/canon/use-hotkeys";
import { usePrices } from "@/hooks/canon/use-prices";
import type { Entry, Franchise } from "@/types/canon/canon";
import type { SearchHit } from "@/types/canon/search";
import type { FilterState, SortKey, SortState } from "@/types/canon/table";
import { filterEntries } from "@/utils/canon/filter-entries";
import { statsFor } from "@/utils/canon/franchise-stats";
import { formatHash, parseHash } from "@/utils/canon/hash-view";
import { sortEntries } from "@/utils/canon/sort-entries";
import { toCsv } from "@/utils/canon/to-csv";

const PRICE_BATCH = 60;

interface CanonAppProps {
  /** The whole dataset, read from Neon by the server component above and handed
   *  down once. Filtering, sorting and search stay on the client so the table
   *  keeps responding without a round trip. */
  franchises: readonly Franchise[];
}

export default function CanonApp({ franchises: FRANCHISES }: CanonAppProps) {
  // Derived from the prop rather than computed at module scope, which is where
  // they lived while the dataset was a static JSON import. Both are O(n) over
  // 690 games and the input only changes on revalidation, so memoising on the
  // array identity keeps the old cost profile.
  const ALL_ENTRIES = useMemo<readonly Entry[]>(
    () => FRANCHISES.flatMap((item) => item.games.map((game) => ({ game, franchise: item }))),
    [FRANCHISES],
  );

  const ENTRY_BY_ID = useMemo(
    () => new Map(ALL_ENTRIES.map((entry) => [entry.game.id, entry])),
    [ALL_ENTRIES],
  );

  const [gridView, setGridView] = useState(true);
  const [activeId, setActiveId] = useState(ALL_FRANCHISES);
  const [activeArc, setActiveArc] = useState("");
  const [navQuery, setNavQuery] = useState("");
  const [navOpen, setNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [detailId, setDetailId] = useState("");
  const [focusGameId, setFocusGameId] = useState("");
  const [sort, setSort] = useState<SortState>({ key: "franchise", direction: 1 });
  const [filter, setFilter] = useState<FilterState>(EMPTY_FILTER);
  const navInputRef = useRef<HTMLInputElement>(null);

  const { entries: userEntries, setField, clearEntries } = useEntries();

  const franchise = useMemo(
    () => FRANCHISES.find((item) => item.id === activeId) ?? null,
    [FRANCHISES, activeId],
  );

  const scoped = useMemo(() => {
    if (franchise === null) return ALL_ENTRIES;
    const games =
      activeArc === "" ? franchise.games : franchise.games.filter((game) => game.arc === activeArc);
    return games.map((game) => ({ game, franchise }));
  }, [franchise, activeArc, ALL_ENTRIES]);

  // Nothing is priced while the grid is up: there is no table to put a price
  // in, and pricing the first sixty of all 690 games burns the rate limit on
  // rows nobody asked to see.
  const autoPriceGames = useMemo(
    () => (gridView ? [] : scoped.slice(0, PRICE_BATCH).map((entry) => entry.game)),
    [gridView, scoped],
  );

  const { prices, status: priceStatus, message: priceMessage, refresh } = usePrices(autoPriceGames);

  const rows = useMemo(
    () => sortEntries(filterEntries(scoped, filter, userEntries), sort, { userEntries, prices }),
    [scoped, filter, userEntries, sort, prices],
  );

  const openFranchise = useCallback((id: string, arcId = "") => {
    setGridView(false);
    setActiveId(id);
    setActiveArc(arcId);
    setNavOpen(false);
    setSort({ key: id === ALL_FRANCHISES ? "franchise" : "order", direction: 1 });
  }, []);

  // The address bar is the only place this view survives a reload, and the only
  // way to hand someone a link to one series. Applied after mount rather than in
  // the initial state so the server-rendered markup still matches.
  useEffect(() => {
    const view = parseHash(window.location.hash);
    if (view === null || view.gridView) return;
    if (view.franchiseId !== "" && !FRANCHISES.some((item) => item.id === view.franchiseId)) return;
    Promise.resolve().then(() => openFranchise(view.franchiseId, view.arcId));
  }, [FRANCHISES, openFranchise]);

  useEffect(() => {
    const next = formatHash({ gridView, franchiseId: activeId, arcId: activeArc });
    if (window.location.hash !== next) window.history.replaceState(null, "", next);
  }, [gridView, activeId, activeArc]);

  const showGrid = useCallback(() => {
    setGridView(true);
    setNavOpen(false);
  }, []);

  const onSort = useCallback((key: SortKey) => {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === 1 ? -1 : 1 }
        : { key, direction: 1 },
    );
  }, []);

  const onFilterChange = useCallback((patch: Partial<FilterState>) => {
    setFilter((current) => ({ ...current, ...patch }));
  }, []);

  const onCopyCsv = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(toCsv(rows, userEntries, prices));
      return true;
    } catch (error) {
      console.warn("clipboard write failed", error);
      return false;
    }
  }, [rows, userEntries, prices]);

  const onRefreshPrices = useCallback(() => {
    refresh(rows.slice(0, PRICE_BATCH).map((entry) => entry.game));
  }, [refresh, rows]);

  const onPick = useCallback(
    (hit: SearchHit) => {
      setPaletteOpen(false);
      openFranchise(hit.franchiseId);
      setFocusGameId(hit.kind === "game" ? hit.id : "");
    },
    [openFranchise],
  );

  const step = useCallback(
    (delta: number) => {
      const at = FRANCHISES.findIndex((item) => item.id === activeId);
      const next = FRANCHISES[(at + delta + FRANCHISES.length) % FRANCHISES.length];
      if (next !== undefined) openFranchise(next.id);
    },
    [FRANCHISES, activeId, openFranchise],
  );

  const closeTop = useCallback(() => {
    if (paletteOpen) return setPaletteOpen(false);
    if (shortcutsOpen) return setShortcutsOpen(false);
    if (detailId !== "") return setDetailId("");
    if (navOpen) return setNavOpen(false);
    setNavQuery("");
  }, [paletteOpen, shortcutsOpen, detailId, navOpen]);

  useHotkeys({
    "mod+k": () => setPaletteOpen(true),
    "/": () => navInputRef.current?.focus(),
    "?": () => setShortcutsOpen(true),
    g: showGrid,
    "[": () => step(-1),
    "]": () => step(1),
    escape: closeTop,
  });

  const filtersActive = useMemo(
    () => Object.values(filter).some((value) => value !== ""),
    [filter],
  );

  const stats = useMemo(
    () => (franchise === null ? null : statsFor(franchise, userEntries)),
    [franchise, userEntries],
  );

  const arcCountFor = useCallback(
    (arcId: string) =>
      franchise === null ? 0 : franchise.games.filter((game) => game.arc === arcId).length,
    [franchise],
  );

  const detail = detailId === "" ? undefined : ENTRY_BY_ID.get(detailId);

  const sidebar = (
    <FranchiseSidebar
      activeId={activeId}
      franchises={FRANCHISES}
      gridActive={gridView}
      inputRef={navInputRef}
      onQueryChange={setNavQuery}
      onSelect={openFranchise}
      onShowGrid={showGrid}
      query={navQuery}
      totalCount={ALL_ENTRIES.length}
      userEntries={userEntries}
    />
  );

  return (
    <div className="flex h-dvh flex-col text-[13px]">
      <AppHeader
        crumb={gridView ? "" : (franchise?.name ?? "Every game")}
        onHome={showGrid}
        onOpenNav={() => setNavOpen(true)}
        onOpenPalette={() => setPaletteOpen(true)}
        onOpenShortcuts={() => setShortcutsOpen(true)}
      />
      <ImportBanner />

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-60 shrink-0 border-line border-r lg:block xl:w-64">
          {sidebar}
        </aside>

        {navOpen ? (
          <div className="fixed inset-0 z-40 flex lg:hidden">
            <Backdrop label="Close the franchise list" onClose={() => setNavOpen(false)} />
            <div className="anim-slide-left relative h-full w-72 max-w-[85vw] bg-surface shadow-[var(--tone-cast)]">
              {sidebar}
            </div>
          </div>
        ) : null}

        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          {gridView ? (
            <FranchiseGrid
              franchises={FRANCHISES}
              onQueryChange={setNavQuery}
              onSelect={openFranchise}
              query={navQuery}
              userEntries={userEntries}
            />
          ) : (
            <>
              {franchise === null || stats === null ? null : (
                <FranchiseHead
                  activeArc={activeArc}
                  arcCountFor={arcCountFor}
                  franchise={franchise}
                  onSelectArc={setActiveArc}
                  stats={stats}
                />
              )}

              <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-line border-b px-2 py-2">
                <FilterControls filter={filter} onChange={onFilterChange} />
                <ToolbarActions
                  filtersActive={filtersActive}
                  onClearEntries={clearEntries}
                  onCopyCsv={onCopyCsv}
                  onRefreshPrices={onRefreshPrices}
                  onResetFilters={() => setFilter(EMPTY_FILTER)}
                  priceMessage={priceMessage}
                  priceStatus={priceStatus}
                  shown={rows.length}
                  total={scoped.length}
                  tracked={Object.keys(userEntries).length}
                />
              </div>

              <div className="min-h-0 flex-1">
                <CanonTable
                  entries={rows}
                  focusGameId={focusGameId}
                  franchise={franchise}
                  onFieldChange={setField}
                  onOpenGame={setDetailId}
                  onResetFilters={() => setFilter(EMPTY_FILTER)}
                  onSort={onSort}
                  prices={prices}
                  sort={sort}
                  userEntries={userEntries}
                />
              </div>
            </>
          )}
        </main>
      </div>

      {paletteOpen ? (
        <CommandPalette
          franchises={FRANCHISES}
          onClose={() => setPaletteOpen(false)}
          onPick={onPick}
        />
      ) : null}

      {shortcutsOpen ? <ShortcutsDialog onClose={() => setShortcutsOpen(false)} /> : null}

      {detail === undefined ? null : (
        <GameDetail entry={detail} onClose={() => setDetailId("")} quote={prices[detail.game.id]} />
      )}
    </div>
  );
}
