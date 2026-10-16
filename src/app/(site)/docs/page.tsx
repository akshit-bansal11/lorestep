import type { Metadata } from "next";
import Link from "next/link";
import HotkeyList from "@/components/canon/HotkeyList";
import ProseSection from "@/components/site/ProseSection";
import { STATUSES } from "@/constants/canon/statuses";
import { TIER_OPTIONS } from "@/constants/canon/tiers";
import { CODE_CLASS, PAGE_TITLE_CLASS, PROSE_CLASS, TEXT_LINK_CLASS } from "@/constants/canon/ui";
import { DOCS_SECTIONS } from "@/constants/docs/sections";
import { REPO_URL } from "@/constants/site";
import { cn } from "@/utils/cn";

export const metadata: Metadata = {
  title: "Docs — Lorestep",
  description:
    "How to use Lorestep, its keyboard shortcuts, where its data comes from, how to report a wrong entry, and how to work on the code.",
};

const listNames = (items: readonly { label: string }[]) =>
  items.map((item) => item.label).join(", ");

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-5 py-12">
      <header className="flex flex-col gap-3">
        <h1 className={PAGE_TITLE_CLASS}>Docs</h1>
        <nav aria-label="On this page">
          <ol className={cn(PROSE_CLASS, "flex list-decimal flex-col gap-1 pl-5")}>
            {DOCS_SECTIONS.map((section) => (
              <li key={section.id}>
                <a className={TEXT_LINK_CLASS} href={`#${section.id}`}>
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </header>

      <ProseSection id="using" title="Using the site">
        <p className={PROSE_CLASS}>
          The home page lists three sections: Games, Movies &amp; Series, and Books. Books is empty
          for now.
        </p>
        <p className={PROSE_CLASS}>
          <strong className="font-medium text-ink">Games</strong> opens on a grid of every
          franchise. Pick one to get its table, one row per game in story order. The sidebar filters
          and switches franchises, and on a narrow screen it opens from the ☰ button. Above the
          table you can search the games, filter them by status, by tier ({listNames(TIER_OPTIONS)})
          and by platform, sort by a column, and reset the filters. Select a game&apos;s title to
          open its detail panel, with its editions and the note on why it sits where it does.
        </p>
        <p className={PROSE_CLASS}>
          Each row has three fields you set yourself: status ({listNames(STATUSES)}), the device you
          play on, and the store you own it from. They are saved in this browser and shared between
          its open tabs. Clearing a game&apos;s status clears its device and store too. &ldquo;Clear
          tracking&rdquo; wipes every game, and asks for a second press first. &ldquo;Copy
          CSV&rdquo; copies the table.
        </p>
        <p className={PROSE_CLASS}>
          &ldquo;Update data&rdquo; fetches current best prices from IsThereAnyDeal for the rows in
          view, up to 60 at a time. Prices are kept in the browser and refreshed in the background
          when you open the site, once they are 30 minutes old.
        </p>
        <p className={PROSE_CLASS}>
          The current view lives in the address, as in{" "}
          <code className={CODE_CLASS}>/games#/witcher</code>, so a reload keeps your place and a
          link opens one series.
        </p>
        <p className={PROSE_CLASS}>
          <strong className="font-medium text-ink">Movies &amp; Series</strong> lists each
          chronology. Open one for its watch order, grouped into blocks, with placement notes that
          set a run of episodes against the films around it.
        </p>
      </ProseSection>

      <ProseSection id="shortcuts" title="Keyboard shortcuts">
        <p className={PROSE_CLASS}>
          These work in the games view. Press <kbd className={CODE_CLASS}>?</kbd> there to see them.
        </p>
        <HotkeyList />
      </ProseSection>

      <ProseSection id="data" title="Where the data comes from">
        <p className={PROSE_CLASS}>
          The orders, scopes and notes were written for this site. Prices come from IsThereAnyDeal,
          and release years, ratings, genres and time-to-beat for 72 of the games come from IGDB;
          the rest were written by hand and are not checked against a source.{" "}
          <Link className={TEXT_LINK_CLASS} href="/about#sources">
            The full list of sources
          </Link>{" "}
          is on the About page.
        </p>
      </ProseSection>

      <ProseSection id="report" title="Reporting a wrong entry">
        <p className={PROSE_CLASS}>
          A game in the wrong place, a missing title or a wrong year:{" "}
          <a className={TEXT_LINK_CLASS} href={`${REPO_URL}/issues/new`}>
            open an issue on GitHub
          </a>{" "}
          naming the franchise, the entry, what is wrong, and a source for the order you expect. For
          a security problem, use a{" "}
          <a className={TEXT_LINK_CLASS} href={`${REPO_URL}/security/advisories/new`}>
            private security advisory
          </a>{" "}
          instead.
        </p>
      </ProseSection>

      <ProseSection id="developers" title="Developers">
        <p className={PROSE_CLASS}>
          Lorestep is a Next.js app in TypeScript, styled with Tailwind CSS, reading a Neon Postgres
          database through Drizzle. The content pages read the database when they are built and
          revalidate hourly, so <code className={CODE_CLASS}>npm run dev</code> and{" "}
          <code className={CODE_CLASS}>npm run build</code> need{" "}
          <code className={CODE_CLASS}>DATABASE_URL</code>. Live prices need{" "}
          <code className={CODE_CLASS}>ITAD_API_KEY</code>; the enrichment script also needs IGDB
          credentials. Every variable is described in{" "}
          <code className={CODE_CLASS}>.env.example</code>.
        </p>
        <p className={PROSE_CLASS}>
          <code className={CODE_CLASS}>npm run check</code> is the gate: it formats, lints,
          type-checks, checks the dataset and runs the unit tests. CI runs the same checks without
          writing, and on <code className={CODE_CLASS}>main</code> also builds the site and runs the
          Playwright suite.
        </p>
        <p className={PROSE_CLASS}>
          The{" "}
          <a className={TEXT_LINK_CLASS} href={`${REPO_URL}#readme`}>
            README
          </a>{" "}
          covers the scripts, layout, routes and data model, and{" "}
          <a className={TEXT_LINK_CLASS} href={`${REPO_URL}/blob/main/CONTRIBUTING.md`}>
            CONTRIBUTING
          </a>{" "}
          covers setting up and sending a change.
        </p>
      </ProseSection>
    </main>
  );
}
