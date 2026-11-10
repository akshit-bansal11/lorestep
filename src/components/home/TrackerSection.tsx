import StatusChip from "@/components/log/StatusChip";
import {
  BLOCK_TITLE_CLASS,
  FIELD_SECTION_CLASS,
  PAGE_CLASS,
  SECTION_GAP_CLASS,
  TITLE_CLASS,
} from "@/constants/canon/ui";
import { TRACKER_EXAMPLE_CAPTION, TRACKER_EXAMPLE_ROWS } from "@/constants/home/tracker-example";
import type { HomeSectionProps } from "@/types/home/section-props";
import { cn } from "@/utils/cn";

export default function TrackerSection({ className }: HomeSectionProps) {
  return (
    <section
      aria-labelledby="home-tracker"
      className={cn(FIELD_SECTION_CLASS, SECTION_GAP_CLASS, className)}
    >
      <div className={cn(PAGE_CLASS, "grid gap-12 lg:grid-cols-[4fr_8fr] lg:gap-24")}>
        <div className="flex flex-col gap-6">
          <h2 id="home-tracker" className={BLOCK_TITLE_CLASS}>
            Keep your place.
          </h2>
          <p className="max-w-prose text-[16px] leading-relaxed lg:text-[17px]">
            Each title in your library is Planned, Watching, Completed, On hold or Dropped. Movies,
            series, anime, manga and games live in one place, and you can group them into lists.
          </p>
        </div>
        <figure className="m-0 rounded-overlay bg-canvas p-5 text-ink lg:p-7">
          <ul className="m-0 grid list-none gap-1.5 p-0">
            {TRACKER_EXAMPLE_ROWS.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-4 rounded-control bg-surface px-4 py-3"
              >
                <span className={cn(TITLE_CLASS, "text-[20px]")}>{row.title}</span>
                <StatusChip status={row.status} kind="game" />
              </li>
            ))}
          </ul>
          <figcaption className="mt-4 text-[14px] text-muted">{TRACKER_EXAMPLE_CAPTION}</figcaption>
        </figure>
      </div>
    </section>
  );
}
