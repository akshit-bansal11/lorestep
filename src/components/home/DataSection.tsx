import {
  BLOCK_TITLE_CLASS,
  PAGE_CLASS,
  SECTION_GAP_CLASS,
  TITLE_CLASS,
} from "@/constants/canon/ui";
import { HOME_FACTS } from "@/constants/home/copy";
import type { HomeSectionProps } from "@/types/home/section-props";
import { cn } from "@/utils/cn";

export default function DataSection({ className }: HomeSectionProps) {
  return (
    <section aria-labelledby="home-data" className={cn(SECTION_GAP_CLASS, className)}>
      <div className={cn(PAGE_CLASS, "grid gap-12 lg:grid-cols-[4fr_8fr] lg:gap-24")}>
        <h2 id="home-data" className={BLOCK_TITLE_CLASS}>
          Yours to keep.
        </h2>
        <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2">
          {HOME_FACTS.map((fact, index) => (
            <li
              key={fact.title}
              className={cn(
                "flex flex-col gap-2.5 rounded-card p-7",
                index === 1 || index === 2 ? "bg-raise" : "bg-surface",
              )}
            >
              <h3 className={cn(TITLE_CLASS, "text-[24px] text-ink lg:text-[28px]")}>
                {fact.title}
              </h3>
              <p className="text-muted">{fact.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
