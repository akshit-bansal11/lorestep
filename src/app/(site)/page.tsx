import type { Metadata } from "next";
import SectionCard from "@/components/site/SectionCard";
import { sectionCounts } from "@/lib/db/queries";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Lorestep — story order for connected franchises",
  description:
    "What to play, watch and read, in in-universe order rather than release order. Games, movies and series, and books.",
};

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export default async function Page() {
  const counts = await sectionCounts();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 px-5 py-16">
      <header className="flex flex-col gap-3">
        <h1 className="font-medium text-[22px] text-ink leading-tight tracking-[-0.02em]">
          Lorestep
        </h1>
        <p className="max-w-prose text-[13px] text-muted leading-relaxed">
          Story order for connected franchises — what to play, watch and read in in-universe
          chronology rather than the order things were released. Every entry is sorted by where it
          sits in the story, with the branches and side paths marked.
        </p>
      </header>

      <nav aria-label="Sections">
        <ul className="grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-3">
          <li className="contents">
            <SectionCard
              blurb="Connected game franchises sorted by in-universe chronology, with storyline branches, editions and live prices."
              facts={[
                plural(counts.games.franchises, "franchise", "franchises"),
                plural(counts.games.entries, "game", "games"),
              ]}
              href="/games"
              title="Games"
            />
          </li>
          <li className="contents">
            <SectionCard
              blurb="Watch orders across films and series, including the segment markers that place a run of episodes against the films around it."
              facts={[
                plural(counts.screen.franchises, "chronology", "chronologies"),
                plural(counts.screen.entries, "title", "titles"),
              ]}
              href="/screen"
              title="Movies & Series"
            />
          </li>
          <li className="contents">
            <SectionCard
              blurb="Reading orders for connected book series. No dataset has been written yet, so there is nothing here to read."
              empty={counts.books.entries === 0}
              facts={[]}
              href="/books"
              title="Books"
            />
          </li>
        </ul>
      </nav>
    </main>
  );
}
