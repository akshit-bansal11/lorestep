import type { Metadata } from "next";
import SectionCard from "@/components/site/SectionCard";
import { listScreen } from "@/lib/db/queries";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Movies & Series — Lorestep",
  description: "Watch orders across films and series, in in-universe chronology.",
};

export default async function Page() {
  const franchises = await listScreen();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-12">
      <header className="flex flex-col gap-3">
        <h1 className="font-medium text-[22px] text-ink leading-tight tracking-[-0.02em]">
          Movies &amp; Series
        </h1>
        <p className="max-w-prose text-[13px] text-muted leading-relaxed">
          Watch orders in in-universe chronology. Where a chronology interleaves a series with the
          films around it, the placement is shown as its own line rather than folded into a title.
        </p>
      </header>

      <ul className="grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2">
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
