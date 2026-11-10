"use client";

import { useEffect, useRef } from "react";
import Backdrop from "@/components/canon/Backdrop";
import { TIER_LABEL } from "@/constants/canon/tiers";
import { CONTROL_CLASS, TITLE_CLASS } from "@/constants/canon/ui";
import type { Entry } from "@/types/canon/canon";
import type { PriceQuote } from "@/types/canon/price";
import { storeUrl } from "@/utils/canon/store-url";
import { cn } from "@/utils/cn";

interface GameDetailProps {
  entry: Entry;
  quote: PriceQuote | undefined;
  onClose: () => void;
}

interface FieldProps {
  label: string;
  value: string;
}

function Field({ label, value }: FieldProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-faint">{label}</span>
      <span className="text-[12px] text-ink">{value}</span>
    </div>
  );
}

function priceLine(quote: PriceQuote | undefined): string {
  if (quote === undefined) return "Not fetched";
  const cut = quote.cut > 0 ? ` (−${quote.cut}%)` : "";
  return `$${quote.amount.toFixed(2)} · ${quote.shop}${cut}`;
}

export default function GameDetail({ entry, quote, onClose }: GameDetailProps) {
  const { game, franchise } = entry;
  const closeRef = useRef<HTMLButtonElement>(null);
  const arc = franchise.arcs?.find((item) => item.id === game.arc);
  const genres = game.igdb?.genres ?? [];

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <Backdrop label="Close game details" onClose={onClose} />

      <aside
        aria-label={`${game.title} details`}
        aria-modal="true"
        className={cn(
          "anim-slide-right relative flex h-full w-full max-w-md flex-col",
          "bg-surface shadow-[var(--tone-cast)]",
        )}
        role="dialog"
      >
        <header className="flex shrink-0 items-start gap-3 border-line border-b p-4">
          <div className="flex flex-1 flex-col gap-1">
            <span className="text-[10px] text-faint uppercase tracking-[0.14em]">
              {franchise.name} · #{game.order} in story order
            </span>
            <h2 className={cn(TITLE_CLASS, "text-[22px] text-ink")}>
              {game.title}
            </h2>
            {arc === undefined ? null : (
              <span className="text-[11px] text-muted">Storyline: {arc.name}</span>
            )}
          </div>
          <button
            aria-label="Close"
            className={cn(CONTROL_CLASS, "w-9 shrink-0 px-0 text-center sm:w-7")}
            onClick={onClose}
            ref={closeRef}
            type="button"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Field label="Released" value={String(game.year)} />
            <Field label="Length" value={game.hours === null ? "Unknown" : `${game.hours}h`} />
            <Field label="Best version" value={game.version} />
            <Field label="Runs on" value={game.platform} />
            <Field label="Where" value={game.storefront} />
            <Field label="Priority" value={TIER_LABEL[game.tier]} />
            <Field label="List price" value={game.msrp} />
            <Field label="Best now" value={priceLine(quote)} />
          </div>

          <section className="flex flex-col gap-1.5">
            <h3 className="text-[11px] text-faint">Why here</h3>
            <p className="text-[12px] text-muted leading-relaxed">{game.note}</p>
          </section>

          {genres.length === 0 ? null : (
            <section className="flex flex-col gap-1.5">
              <h3 className="text-[11px] text-faint">Genres</h3>
              <p className="text-[12px] text-muted">{genres.join(" · ")}</p>
            </section>
          )}

          {game.editions.length === 0 ? null : (
            <section className="flex flex-col gap-2">
              <h3 className="text-[11px] text-faint">Editions</h3>
              <ul className="flex flex-col gap-2">
                {game.editions.map((edition) => (
                  <li
                    className={cn(
                      "rounded-card p-2.5",
                      edition.recommended ? "bg-raise" : "bg-canvas",
                    )}
                    key={`${edition.name}-${edition.year}`}
                  >
                    <span className="flex items-baseline gap-2">
                      <span
                        className={cn(
                          "flex-1 text-[12px]",
                          edition.recommended ? "text-ink" : "text-muted",
                        )}
                      >
                        {edition.recommended ? "✓ " : ""}
                        {edition.name}
                      </span>
                      <span className="text-[10px] text-faint tabular-nums">
                        {edition.year}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-[11px] text-faint leading-relaxed">
                      {edition.platforms} — {edition.note}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <footer className="shrink-0 border-line border-t p-3">
          <a
            className={cn(CONTROL_CLASS, "flex items-center justify-center")}
            href={quote?.url === undefined || quote.url === "" ? storeUrl(game) : quote.url}
            rel="noreferrer"
            target="_blank"
          >
            Open on {quote?.shop ?? game.storefront} ↗
          </a>
        </footer>
      </aside>
    </div>
  );
}
