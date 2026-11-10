import {
  BLOCK_TITLE_CLASS,
  PAGE_CLASS,
  SECTION_GAP_CLASS,
  TITLE_CLASS,
} from "@/constants/canon/ui";
import { HOME_FAQ } from "@/constants/home/copy";
import type { HomeSectionProps } from "@/types/home/section-props";
import { cn } from "@/utils/cn";

export default function FaqSection({ className }: HomeSectionProps) {
  return (
    <section aria-labelledby="home-faq" className={cn(SECTION_GAP_CLASS, className)}>
      <div className={cn(PAGE_CLASS, "grid gap-12 lg:grid-cols-[4fr_8fr] lg:gap-24")}>
        <h2 id="home-faq" className={BLOCK_TITLE_CLASS}>
          Questions.
        </h2>
        <div className="grid gap-2">
          {HOME_FAQ.map((item) => (
            <details key={item.question} className="group rounded-card bg-surface px-6">
              <summary
                className={cn(
                  TITLE_CLASS,
                  "flex cursor-pointer list-none justify-between gap-4 py-5 text-[22px] text-ink [&::-webkit-details-marker]:hidden",
                )}
              >
                {item.question}
                <span
                  aria-hidden="true"
                  className="text-accent transition-transform group-open:rotate-45 motion-reduce:transition-none"
                >
                  +
                </span>
              </summary>
              <p className="max-w-[62ch] pb-5 text-ink">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
