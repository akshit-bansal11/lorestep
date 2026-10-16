import type { Metadata } from "next";
import Link from "next/link";
import ProseSection from "@/components/site/ProseSection";
import { PAGE_TITLE_CLASS, PROSE_CLASS, TEXT_LINK_CLASS } from "@/constants/canon/ui";
import { REPO_URL } from "@/constants/site";
import { cn } from "@/utils/cn";

export const metadata: Metadata = {
  title: "About — Lorestep",
  description:
    "What Lorestep is, how its story order is decided, what it does not do, and where its data comes from.",
};

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-5 py-12">
      <header className="flex flex-col gap-3">
        <h1 className={PAGE_TITLE_CLASS}>About Lorestep</h1>
        <p className={PROSE_CLASS}>
          Lorestep puts connected franchises in story order: what to play, watch and read in
          in-universe chronology rather than the order things were released. It covers{" "}
          <Link className={TEXT_LINK_CLASS} href="/games">
            games
          </Link>{" "}
          and{" "}
          <Link className={TEXT_LINK_CLASS} href="/screen">
            movies and series
          </Link>
          . Books are listed too, but no dataset has been written for them, so that section says so
          rather than showing invented titles.
        </p>
      </header>

      <ProseSection id="order" title="How story order is decided">
        <p className={PROSE_CLASS}>
          Every game and every film or series has a position in its franchise&apos;s story, and the
          tables list them in that order, not by release year. Each franchise states its scope, what
          is in and what is left out, and carries a note on how its order was decided, which opens
          from &ldquo;How this order was decided&rdquo; above its table. The Ace Attorney note, for
          one, explains that The Great Ace Attorney is a Meiji-era prequel about Phoenix&apos;s
          ancestor.
        </p>
        <p className={PROSE_CLASS}>
          Some franchises split into storylines that stand alone, such as Assassin&apos;s Creed,
          Zelda&apos;s branching timeline and Mega Man&apos;s far-future chain. Those declare their
          storylines, the games of each one sit together in the order, and the table breaks into a
          section per storyline. Each game also carries a note on why it sits where it does, shown
          under &ldquo;Why here&rdquo; in its detail panel, and is marked Core, Optional or
          Skippable.
        </p>
        <p className={PROSE_CLASS}>
          Film and series chronologies are grouped into named blocks: phases, eras, sagas. Some
          lines are not titles at all but placement notes, such as &ldquo;AoS S1 Ep 1–7 · Before
          Thor: The Dark World&rdquo;, which set a run of episodes against the films around it. They
          carry the order&apos;s reasoning and are not counted as things to watch. The MCU watch
          order and the wider Marvel chronology are kept apart: one is the Disney canon, the other
          spans Fox, Sony and the pre-MCU era, and merging them would mean inventing canon
          judgements.
        </p>
      </ProseSection>

      <ProseSection id="limits" title="What it does not do">
        <ul className={cn(PROSE_CLASS, "flex list-disc flex-col gap-2 pl-5")}>
          <li>
            There are no accounts and no sync. What you track is kept in this browser only: another
            browser or device starts empty, and clearing the site&apos;s data clears it.
          </li>
          <li>Books has no dataset yet.</li>
          <li>
            Not every number is checked against a source. Release years, runtimes and prices for the
            original 12 franchises (72 games) were pulled from IsThereAnyDeal and IGDB. The 114
            franchises added after them were written by hand: years and titles were checked, but
            lengths and prices are approximations.
          </li>
          <li>
            Live prices cover PC storefronts only, because that is what IsThereAnyDeal tracks.
            Console games show the price they were written with.
          </li>
        </ul>
      </ProseSection>

      <ProseSection id="sources" title="Data sources and credits">
        <ul className={cn(PROSE_CLASS, "flex list-disc flex-col gap-2 pl-5")}>
          <li>The game orders, scopes and notes were written for this site.</li>
          <li>
            Prices and historical lows come from{" "}
            <a className={TEXT_LINK_CLASS} href="https://isthereanydeal.com">
              IsThereAnyDeal
            </a>
            .
          </li>
          <li>
            Release years, ratings, genres and time-to-beat for the enriched games come from{" "}
            <a className={TEXT_LINK_CLASS} href="https://www.igdb.com">
              IGDB
            </a>
            .
          </li>
          <li>
            The film and series orders were merged from two source lists, kept apart where they
            disagree about scope. Where those lists originated is not recorded, so they are not
            credited to anyone here.
          </li>
          <li>
            The code is open source under the MIT License, on{" "}
            <a className={TEXT_LINK_CLASS} href={REPO_URL}>
              GitHub
            </a>
            .
          </li>
        </ul>
        <p className={PROSE_CLASS}>
          Found something in the wrong place?{" "}
          <Link className={TEXT_LINK_CLASS} href="/docs#report">
            Here is how to report it
          </Link>
          .
        </p>
      </ProseSection>
    </main>
  );
}
