import { ACTION_CLASS } from "@/constants/canon/ui";
import { cn } from "@/utils/cn";

/** A text field on the auth pages: the site's control look at a touch-friendly height. */
export const AUTH_INPUT_CLASS =
  "h-10 w-full rounded-control border border-line bg-surface px-3 text-[13px] text-ink placeholder:text-faint transition-colors duration-[160ms] hover:border-edge focus-visible:border-edge disabled:opacity-40 motion-reduce:transition-none";

export const AUTH_PRIMARY_CLASS = cn(
  ACTION_CLASS,
  "w-full justify-center bg-accent text-accent-ink hover:brightness-110 disabled:pointer-events-none disabled:opacity-60",
);

export const AUTH_SECONDARY_CLASS = cn(
  ACTION_CLASS,
  "w-full justify-center border border-line bg-surface text-ink hover:border-accent-line disabled:pointer-events-none disabled:opacity-60",
);

/** A row in the account menu: a link or the sign-out button, identical to the eye. */
export const AUTH_MENU_ITEM_CLASS =
  "flex w-full items-center rounded-control px-2.5 py-2 text-left text-[13px] text-ink transition-colors duration-[160ms] hover:bg-surface disabled:opacity-60 motion-reduce:transition-none";
