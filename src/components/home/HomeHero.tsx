import Link from "next/link";

import {
  ACTION_CLASS,
  ACTION_GHOST_CLASS,
  ACTION_PRIMARY_CLASS,
  DISPLAY_CLASS,
  NUM_CLASS,
  PAGE_CLASS,
  PROSE_CLASS,
  TITLE_CLASS,
} from "@/constants/canon/ui";
import { HERO_ACTIONS, HERO_LEDE, HERO_STATS, HERO_TITLE } from "@/constants/home/sections";
import type { HomeHeroProps } from "@/types/home/home-hero";

export default function HomeHero({ counts, demo }: HomeHeroProps) {
  const values = {
    franchises: counts.games.franchises,
    games: counts.games.entries,
    chronologies: counts.screen.franchises,
    titles: counts.screen.entries,
  };

  return (
    <section className="pt-10 pb-20 lg:pt-16 lg:pb-32">
      <div className={PAGE_CLASS}>
        <h1 className={`${DISPLAY_CLASS} max-w-[22ch] text-[clamp(2.5rem,7vw,7.5rem)] text-ink`}>
          {HERO_TITLE}
        </h1>
        <div className="mt-10 grid gap-12 lg:mt-16 lg:grid-cols-[5fr_7fr] lg:gap-20">
          <div>
            <p className={`${PROSE_CLASS} max-w-[32ch] text-[19px] lg:text-[22px]`}>{HERO_LEDE}</p>
            <div className="mt-9 flex flex-wrap gap-3.5">
              <Link
                href={HERO_ACTIONS.primary.href}
                className={`${ACTION_CLASS} ${ACTION_PRIMARY_CLASS}`}
              >
                {HERO_ACTIONS.primary.label}
              </Link>
              <Link
                href={HERO_ACTIONS.ghost.href}
                className={`${ACTION_CLASS} ${ACTION_GHOST_CLASS}`}
              >
                {HERO_ACTIONS.ghost.label}
              </Link>
            </div>
            <dl className="mt-14 grid grid-cols-2 gap-x-8 gap-y-7">
              {HERO_STATS.map((stat) => (
                <div key={stat.id} className="flex flex-col-reverse gap-1">
                  <dt className="text-[15px] text-muted">{stat.label}</dt>
                  <dd
                    className={`${TITLE_CLASS} ${NUM_CLASS} text-[clamp(2.5rem,4vw,4rem)] text-ink`}
                  >
                    {values[stat.id]}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <div>{demo}</div>
        </div>
      </div>
    </section>
  );
}
