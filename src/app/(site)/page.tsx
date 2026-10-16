import type { Metadata } from "next";
import Link from "next/link";
import SectionCard from "@/components/site/SectionCard";
import { ACTION_CLASS, NUM_CLASS } from "@/constants/canon/ui";
import { HOME_STEPS } from "@/constants/home/steps";
import { sectionCounts } from "@/lib/db/queries";
import { cn } from "@/utils/cn";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Lorestep — story order for connected franchises",
  description:
    "What to play, watch and read, in in-universe order rather than release order. Games, movies and series, and books.",
};

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export default async function Page() {
  const counts = await sectionCounts();

  const stats = [
    { value: counts.games.franchises, label: "game franchises" },
    { value: counts.games.entries, label: "games in order" },
    { value: counts.screen.franchises, label: "screen chronologies" },
    { value: counts.screen.entries, label: "films and series" },
  ];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-14 px-5 py-14 sm:py-20">
      <section aria-labelledby="hero-heading" className="anim-rise flex flex-col gap-6">
        <p className="w-fit rounded-full border border-accent-line bg-accent-soft px-3 py-1 text-[11px] text-accent">
          Story order for connected franchises
        </p>
        <h1
          className="max-w-[18ch] font-semibold text-[34px] text-ink leading-[1.08] tracking-[-0.035em] sm:text-[46px]"
          id="hero-heading"
        >
          Play, watch and read it in the order it happened.
        </h1>
        <p className="max-w-prose text-[15px] text-muted leading-relaxed">
          What to play, watch and read in in-universe chronology rather than the order things were
          released. Every entry is sorted by where it sits in the story, with the branches and side
          paths marked.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            className={cn(ACTION_CLASS, "group bg-accent text-accent-ink hover:brightness-110")}
            href="/games"
          >
            Browse the games
            <span
              aria-hidden="true"
              className="transition-transform duration-[160ms] group-hover:translate-x-0.5 motion-reduce:transition-none"
            >
              →
            </span>
          </Link>
          <Link
            className={cn(
              ACTION_CLASS,
              "border border-line bg-surface text-ink hover:border-accent-line",
            )}
            href="/screen"
          >
            Movies &amp; Series
          </Link>
        </div>
      </section>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-4">
        {stats.map((stat) => (
          <div className="flex flex-col gap-1 bg-canvas p-4" key={stat.label}>
            <dt className="order-2 text-[11px] text-muted">{stat.label}</dt>
            <dd
              className={cn(
                NUM_CLASS,
                "order-1 m-0 font-medium text-[24px] text-ink tracking-[-0.02em]",
              )}
            >
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="sections-heading" className="flex flex-col gap-4">
        <h2 className="font-medium text-[15px] text-ink tracking-[-0.01em]" id="sections-heading">
          Sections
        </h2>
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
      </section>

      <section aria-labelledby="steps-heading" className="flex flex-col gap-4">
        <h2 className="font-medium text-[15px] text-ink tracking-[-0.01em]" id="steps-heading">
          How it works
        </h2>
        {/* A track rather than a third row of cards: a rail runs through the
            numbered stops, down the side on a phone and across from sm up. */}
        <ol className="grid list-none grid-cols-1 gap-6 p-0 sm:grid-cols-3 sm:gap-5">
          {HOME_STEPS.map((step, index) => (
            <li
              className="relative flex flex-col gap-2 border-line border-l pl-5 sm:border-t sm:border-l-0 sm:pt-5 sm:pl-0"
              key={step.title}
            >
              <span
                aria-hidden="true"
                className={cn(
                  NUM_CLASS,
                  "absolute top-0 -left-3 flex size-6 items-center justify-center rounded-full border border-accent-line bg-canvas text-[11px] text-accent sm:-top-3 sm:left-0",
                )}
              >
                {index + 1}
              </span>
              <span className="pt-0.5 font-medium text-[13px] text-ink sm:pt-0">{step.title}</span>
              <span className="text-[12px] text-muted leading-relaxed">{step.body}</span>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
