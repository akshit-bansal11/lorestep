"use client";

import { useEffect, useRef } from "react";
import GameCell from "@/components/canon/GameCell";
import OptionSelect from "@/components/canon/OptionSelect";
import PriceCell from "@/components/canon/PriceCell";
import { FIELD_LABEL, STATUSES } from "@/constants/canon/statuses";
import { TIER_LABEL } from "@/constants/canon/tiers";
import { CELL_CLASS, NUM_CLASS, TITLE_CLASS } from "@/constants/canon/ui";
import type { Entry } from "@/types/canon/canon";
import type { PriceQuote } from "@/types/canon/price";
import type { UserEntry, UserField } from "@/types/canon/user";
import { optionsFor } from "@/utils/canon/entry-options";
import { cn } from "@/utils/cn";

interface CanonRowProps {
  entry: Entry;
  user: UserEntry | undefined;
  quote: PriceQuote | undefined;
  showFranchise: boolean;
  index: number;
  flash: boolean;
  onFieldChange: (gameId: string, field: UserField, value: string) => void;
  onOpen: (gameId: string) => void;
}

export default function CanonRow({
  entry,
  user,
  quote,
  showFranchise,
  index,
  flash,
  onFieldChange,
  onOpen,
}: CanonRowProps) {
  const { game } = entry;
  const tracked = user?.status !== undefined;
  const rowRef = useRef<HTMLTableRowElement>(null);

  // Arriving from the palette: bring the row into view rather than leaving the
  // reader to hunt for it in a table that can be nine hundred rows long.
  useEffect(() => {
    if (flash) rowRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [flash]);

  const userSelect = (field: UserField, placeholder: string) => (
    <OptionSelect
      className="w-full"
      label={`${FIELD_LABEL[field]} — ${game.title}`}
      onChange={(value) => onFieldChange(game.id, field, value)}
      options={field === "status" ? STATUSES : optionsFor(field)}
      placeholder={placeholder}
      value={user?.[field] ?? ""}
    />
  );

  return (
    <tr
      className={cn(
        "group transition-colors duration-[90ms] hover:bg-surface",
        flash && "anim-flash",
      )}
      ref={rowRef}
      style={{ "--row-index": index }}
    >
      {showFranchise ? (
        <td className={cn(CELL_CLASS, TITLE_CLASS, "text-[13px] text-faint")}>
          {entry.franchise.name}
        </td>
      ) : null}

      <td className={cn(CELL_CLASS, NUM_CLASS, "text-right text-faint")}>{game.order}</td>

      <td
        className={cn(
          CELL_CLASS,
          "sticky left-0 z-10 bg-canvas group-hover:bg-surface",
          "border-line border-r",
        )}
      >
        <GameCell game={game} onOpen={() => onOpen(game.id)} />
      </td>

      <td className={CELL_CLASS}>{userSelect("status", "—")}</td>
      <td className={CELL_CLASS}>
        {tracked ? userSelect("device", "—") : <span className="pl-2 text-faint">·</span>}
      </td>
      <td className={CELL_CLASS}>
        {tracked ? userSelect("storefront", "—") : <span className="pl-2 text-faint">·</span>}
      </td>

      <td className={cn(CELL_CLASS, NUM_CLASS, "text-right text-muted")}>{game.year}</td>
      <td className={cn(CELL_CLASS, "text-muted")}>{game.version}</td>
      <td className={cn(CELL_CLASS, "text-muted")}>{game.platform}</td>
      <td className={cn(CELL_CLASS, NUM_CLASS, "text-right text-muted")}>{game.msrp}</td>
      <td className={cn(CELL_CLASS, NUM_CLASS, "text-right")}>
        <PriceCell game={game} quote={quote} />
      </td>
      <td className={cn(CELL_CLASS, NUM_CLASS, "text-right text-muted")}>{game.hours ?? "—"}</td>
      <td className={cn(CELL_CLASS, "text-muted")}>{TIER_LABEL[game.tier]}</td>
      <td className={cn(CELL_CLASS, "text-[12px] text-muted leading-relaxed")}>{game.note}</td>
    </tr>
  );
}
