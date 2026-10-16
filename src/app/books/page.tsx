import type { Metadata } from "next";
import Link from "next/link";
import { CONTROL_CLASS } from "@/constants/canon/ui";
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
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col justify-center gap-5 px-5 py-16">
      <h1 className="font-medium text-[22px] text-ink leading-tight tracking-[-0.02em]">Books</h1>
      <p className="max-w-prose text-[13px] text-muted leading-relaxed">
        Reading orders for connected book series will live here. Nothing has been written yet — no
        dataset exists, so rather than show a placeholder list of invented titles, this section says
        so plainly.
      </p>
      <p className="max-w-prose text-[12px] text-faint leading-relaxed">
        The games and screen sections are built from real datasets: 690 games across 126 franchises,
        and 322 titles across six chronologies.
      </p>
      <Link className={cn(CONTROL_CLASS, "inline-flex w-fit items-center px-3")} href="/">
        ← Back
      </Link>
    </main>
  );
}
