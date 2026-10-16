import type { Metadata } from "next";
import { PAGE_CLASS, PAGE_TITLE_CLASS, PROSE_CLASS } from "@/constants/canon/ui";
import { cn } from "@/utils/cn";

export const metadata: Metadata = {
  title: "Books — Lorestep",
  description: "Reading orders for connected book series. Not yet written.",
};

/**
 * An honest empty state. There is no book dataset, and inventing one to make
 * the section look populated would put fabricated titles and orderings in front
 * of a reader who has no way to tell. It says what is true instead.
 */
export default function Page() {
  return (
    <main className={cn(PAGE_CLASS, "flex flex-1 flex-col justify-center gap-5 py-16")}>
      <h1 className={PAGE_TITLE_CLASS}>Books</h1>
      <p className={PROSE_CLASS}>
        Reading orders for connected book series will live here. Nothing has been written yet — no
        dataset exists, so rather than show a placeholder list of invented titles, this section says
        so plainly.
      </p>
      <p className="max-w-prose text-[12px] text-faint leading-relaxed">
        The games and screen sections are built from real datasets: 690 games across 126 franchises,
        and 322 titles across six chronologies.
      </p>
    </main>
  );
}
