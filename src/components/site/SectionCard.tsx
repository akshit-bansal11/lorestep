import Link from "next/link";
import { CARD_CLASS, NUM_CLASS, TITLE_CLASS } from "@/constants/canon/ui";
import { cn } from "@/utils/cn";

interface SectionCardProps {
  href: string;
  title: string;
  blurb: string;
  /** Rendered in order as a tabular metadata row. Empty means the section has no
   *  content yet, which the card states plainly rather than hiding. */
  facts: readonly string[];
  /** A section with no dataset is still listed, but must not look clickable-
   *  and-rewarding. It renders flat, unlinked, and says so. */
  empty?: boolean;
}

export default function SectionCard({
  href,
  title,
  blurb,
  facts,
  empty = false,
}: SectionCardProps) {
  const body = (
    <>
      <span className="flex items-baseline gap-2">
        <span className={cn(TITLE_CLASS, "flex-1 text-[24px] text-ink")}>{title}</span>
        {empty ? null : (
          <span
            aria-hidden="true"
            className="text-faint transition-[color,transform] duration-[160ms] ease-out group-hover:translate-x-0.5 group-hover:text-accent motion-reduce:transition-none"
          >
            →
          </span>
        )}
      </span>

      <span className={cn(NUM_CLASS, "flex flex-wrap items-center gap-x-2 text-[14px] text-faint")}>
        {facts.length === 0 ? (
          <span>nothing here yet</span>
        ) : (
          facts.map((fact, index) => (
            <span className="flex items-center gap-2" key={fact}>
              {index > 0 ? <span aria-hidden="true">·</span> : null}
              <span>{fact}</span>
            </span>
          ))
        )}
      </span>

      <span className="text-[16px] text-muted leading-relaxed">{blurb}</span>
    </>
  );

  const shape = "flex flex-col items-stretch gap-2 p-4 text-left";

  if (empty) {
    return (
      // Flat on the canvas, with no hover step, rather than faded: lowering opacity took
      // its text below 4.5:1, and the card has to stay readable to say it is empty.
      <div className={cn(CARD_CLASS, shape, "bg-canvas hover:bg-canvas")}>
        {body}
        <span className={cn(NUM_CLASS, "text-[14px] text-faint")}>not started</span>
      </div>
    );
  }

  return (
    <Link
      className={cn(
        CARD_CLASS,
        shape,
        "group hover:-translate-y-0.5",
        "focus-visible:bg-raise",
        "active:translate-y-0 motion-reduce:hover:translate-y-0",
      )}
      href={href}
    >
      {body}
    </Link>
  );
}
