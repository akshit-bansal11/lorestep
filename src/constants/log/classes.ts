import { ACTION_CLASS, ACTION_GHOST_CLASS, ACTION_PRIMARY_CLASS } from "@/constants/canon/ui";
import { cn } from "@/utils/cn";

/** The site's control look at a 44px target (UI-D01). `CONTROL_CLASS` is 28px on wide screens. */
export const LOG_CONTROL_CLASS =
  "h-11 rounded-control border border-edge bg-surface px-3 text-[13px] text-ink placeholder:text-faint transition-[color,border-color,background-color] duration-[160ms] hover:bg-raise focus-visible:border-accent disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none";

/** Dense tracker buttons: the shared round action at 44px and 13px. */
const LOG_ACTION_CLASS = cn(
  ACTION_CLASS,
  "h-11! px-5! text-[13px]! disabled:pointer-events-none disabled:opacity-60",
);

export const LOG_PRIMARY_CLASS = cn(LOG_ACTION_CLASS, ACTION_PRIMARY_CLASS);

export const LOG_SECONDARY_CLASS = cn(LOG_ACTION_CLASS, ACTION_GHOST_CLASS);

/** The delete action: set apart from Save and quiet until hovered (UX-D18). */
export const LOG_DANGER_CLASS = cn(LOG_ACTION_CLASS, "bg-transparent text-muted hover:text-danger");

export const LOG_LABEL_CLASS = "flex flex-col gap-1.5 text-[12px] text-ink";

/** Table header cell, same look as the games table's. */
export const LOG_TH_CLASS =
  "whitespace-nowrap border-line border-b px-2 py-2 text-left font-medium text-[13px] text-muted";

export const LOG_TEXTAREA_CLASS =
  "min-h-28 w-full rounded-control border border-edge bg-surface px-3 py-2 text-[13px] text-ink placeholder:text-faint transition-colors duration-[160ms] hover:bg-raise focus-visible:border-accent disabled:opacity-40 motion-reduce:transition-none";
