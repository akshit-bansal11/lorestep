export const CONTROL_CLASS =
  "h-9 sm:h-7 rounded-control border border-line bg-surface px-2 text-[12px] text-ink transition-[color,border-color,background-color,transform] duration-[160ms] ease-out hover:border-edge hover:bg-raise focus-visible:border-edge active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none motion-reduce:active:scale-100";

export const CELL_CLASS = "border-line border-b px-2 py-[7px] align-top";

export const CARD_CLASS =
  "rounded-card border border-line bg-surface transition-[border-color,transform,box-shadow] duration-[260ms] ease-out motion-reduce:transition-none";

/** Every numeric / identifier surface, so columns line up down the page. */
export const NUM_CLASS = "font-mono tabular-nums";

/** An inline link inside running text. */
export const TEXT_LINK_CLASS =
  "rounded-control text-ink underline decoration-accent-line underline-offset-2 transition-[color,text-decoration-color] duration-[160ms] hover:text-accent hover:decoration-accent motion-reduce:transition-none";

/** A link that sits quietly in a row of others, such as the footer's. */
export const QUIET_LINK_CLASS =
  "rounded-control text-muted transition-colors duration-[160ms] hover:text-accent motion-reduce:transition-none";

export const PAGE_TITLE_CLASS = "font-medium text-[22px] text-ink leading-tight tracking-[-0.02em]";

export const PROSE_CLASS = "max-w-prose text-[13px] text-muted leading-relaxed";

/** A command, path or variable name inside running text. */
export const CODE_CLASS = "font-mono tabular-nums text-[12px] text-ink";

/** A page-level call to action. Colour comes from the caller: solid accent for the primary, outlined for the rest. */
export const ACTION_CLASS =
  "inline-flex h-10 items-center gap-2 rounded-card px-4 font-medium text-[13px] transition-[background-color,border-color,color,transform] duration-[160ms] ease-out active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100";
