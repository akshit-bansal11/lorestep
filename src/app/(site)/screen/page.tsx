import type { Metadata } from "next";
import SectionCard from "@/components/site/SectionCard";
import { PAGE_CLASS, PAGE_TITLE_CLASS, PROSE_CLASS } from "@/constants/canon/ui";
import { listScreen } from "@/lib/db/queries";
import { cn } from "@/utils/cn";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Movies & Series — Lorestep",
  description: "Watch orders across films and series, in in-universe chronology.",
};

export default async function Page() {
  const franchises = await listScreen();

  return (
    <main className={cn(PAGE_CLASS, "flex flex-1 flex-col gap-8 py-12 lg:py-16")}>
      <header className="flex flex-col gap-3">
        <h1 className={PAGE_TITLE_CLASS}>Movies &amp; Series</h1>
        <p className={PROSE_CLASS}>
          Watch orders in in-universe chronology. Where a chronology interleaves a series with the
          films around it, the placement is shown as its own line rather than folded into a title.
        </p>
      </header>

      <ul className="grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {franchises.map((franchise) => {
          const titles = franchise.entries.filter((entry) => entry.kind === "title").length;
          const facts = [`${titles} titles`];
          if (franchise.groups.length > 0) facts.push(`${franchise.groups.length} blocks`);

          return (
            <li className="contents" key={franchise.id}>
              <SectionCard
                blurb={franchise.description}
                facts={facts}
                href={`/screen/${franchise.id}`}
                title={franchise.title}
              />
            </li>
          );
        })}
      </ul>
    </main>
  );
}
