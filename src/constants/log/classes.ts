import { ACTION_CLASS } from "@/constants/canon/ui";
import { cn } from "@/utils/cn";

/** The site's control look at a 44px target (UI-D01). `CONTROL_CLASS` is 28px on wide screens. */
export const LOG_CONTROL_CLASS =
  "h-11 rounded-control border border-line bg-surface px-3 text-[13px] text-ink placeholder:text-faint transition-[color,border-color,background-color] duration-[160ms] hover:border-edge hover:bg-raise focus-visible:border-edge disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none";

export const LOG_PRIMARY_CLASS = cn(
  ACTION_CLASS,
  "h-11! bg-accent text-accent-ink hover:brightness-110 disabled:pointer-events-none disabled:opacity-60",
);

export const LOG_SECONDARY_CLASS = cn(
  ACTION_CLASS,
  "h-11! border border-line bg-surface text-ink hover:border-accent-line disabled:pointer-events-none disabled:opacity-60",
);

/** The delete action: set apart from Save and quiet until hovered (UX-D18). */
export const LOG_DANGER_CLASS = cn(
  ACTION_CLASS,
  "h-11! border border-line text-muted hover:border-accent-line hover:text-accent disabled:pointer-events-none disabled:opacity-60",
);

export const LOG_LABEL_CLASS = "flex flex-col gap-1.5 text-[12px] text-ink";

/** Table header cell, same look as the games table's. */
export const LOG_TH_CLASS =
  "whitespace-nowrap border-edge border-b px-2 py-2 text-left font-medium text-[10px] text-muted uppercase tracking-[0.12em]";

export const LOG_TEXTAREA_CLASS =
  "min-h-28 w-full rounded-control border border-line bg-surface px-3 py-2 text-[13px] text-ink placeholder:text-faint transition-colors duration-[160ms] hover:border-edge focus-visible:border-edge disabled:opacity-40 motion-reduce:transition-none";
