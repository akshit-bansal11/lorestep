export const CONTROL_CLASS =
  "h-9 sm:h-7 rounded-control border border-edge bg-surface px-2 text-[12px] text-ink transition-[color,border-color,background-color,transform] duration-[160ms] ease-out hover:bg-raise focus-visible:border-accent active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none motion-reduce:active:scale-100";

export const CELL_CLASS = "border-line border-b px-2 py-[7px] align-top";

export const CARD_CLASS =
  "rounded-card bg-surface transition-[background-color,transform,box-shadow] duration-[260ms] ease-out hover:bg-raise motion-reduce:transition-none";

/** Every numeric / identifier surface, so columns line up down the page. */
export const NUM_CLASS = "tabular-nums";

/** Display role: headings, brand, footer name. Uppercase, heavy, tight. */
export const DISPLAY_CLASS =
  "font-display font-black uppercase leading-[0.9] tracking-[-0.01em] text-balance";

/** Title role: names, card titles, big figures. Serif, normal case. */
export const TITLE_CLASS = "font-title font-normal normal-case leading-none tracking-[-0.02em]";

/** Marketing section heading (h2). */
export const BLOCK_TITLE_CLASS = `${DISPLAY_CLASS} self-start max-w-[16ch] text-[clamp(2.5rem,5.4vw,6.25rem)]`;

/** An inline link inside running text. */
export const TEXT_LINK_CLASS =
  "rounded-control text-ink underline decoration-accent-line underline-offset-2 transition-[color,text-decoration-color] duration-[160ms] hover:text-accent hover:decoration-accent motion-reduce:transition-none";

/** A link that sits quietly in a row of others, such as the footer's. */
export const QUIET_LINK_CLASS =
  "rounded-control text-muted transition-colors duration-[160ms] hover:text-accent motion-reduce:transition-none";

/** Document page h1. */
export const PAGE_TITLE_CLASS = `${DISPLAY_CLASS} self-start text-[44px] text-ink sm:text-[64px] lg:text-[88px]`;

/** Tracker and account h1. */
export const APP_TITLE_CLASS = `${DISPLAY_CLASS} self-start text-[32px] text-ink lg:text-[40px]`;

/** Running text. Capped at a readable measure; wide screens get bigger type, not longer lines. */
export const PROSE_CLASS = "max-w-prose text-[16px] text-muted leading-relaxed lg:text-[17px]";

/** A command, path or variable name inside running text. */
export const CODE_CLASS = "font-mono tabular-nums text-[12px] text-ink";

/** A page-level call to action. Colour comes from the caller or from ACTION_PRIMARY_CLASS / ACTION_GHOST_CLASS. */
export const ACTION_CLASS =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 font-semibold text-[15px] transition-[background-color,border-color,color,transform,filter] duration-[160ms] ease-out active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100";

export const ACTION_PRIMARY_CLASS = "bg-accent text-accent-ink hover:brightness-110";

export const ACTION_GHOST_CLASS = "bg-raise text-ink hover:bg-line";

/** Vertical rhythm between marketing sections. */
export const SECTION_GAP_CLASS = "py-24 lg:py-40";

/** The single filled blue section a marketing page carries. */
export const FIELD_SECTION_CLASS = "bg-field text-field-ink";

/**
 * The width every document-flow page shares, header and footer included: the
 * whole device up to 1760px, with side padding that grows with the screen.
 * Pages fill the width with columns and grids rather than with longer lines.
 */
export const PAGE_CLASS = "mx-auto w-full max-w-[1760px] px-5 sm:px-8 lg:px-12 2xl:px-16";

export const SECTION_TITLE_CLASS = `${DISPLAY_CLASS} self-start text-[28px] text-ink lg:text-[36px]`;
