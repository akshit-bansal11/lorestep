import Link from "next/link";

import { TIER_LABEL } from "@/constants/canon/tiers";
import {
  BLOCK_TITLE_CLASS,
  NUM_CLASS,
  PAGE_CLASS,
  PROSE_CLASS,
  SECTION_GAP_CLASS,
  TEXT_LINK_CLASS,
  TITLE_CLASS,
} from "@/constants/canon/ui";
import {
  GAMES_ALL_LINK,
  GAMES_COLUMNS,
  GAMES_HOURS_UNKNOWN,
  GAMES_LEDE,
  GAMES_START,
  GAMES_TITLE,
} from "@/constants/home/sections";
import type { GamesSectionProps } from "@/types/home/games-section";
import { groupArcs } from "@/utils/canon/group-arcs";

const HEAD = "px-2 pb-2 sm:px-4 text-left font-medium text-[14px] text-muted";
const CELL = "border-line border-b px-2 py-4 align-top sm:px-4";

export default function GamesSection({ franchise }: GamesSectionProps) {
  const sections = groupArcs(
    franchise.games.map((game) => ({ game, franchise })),
    franchise,
  );

  return (
    <section aria-labelledby="games-title" className={SECTION_GAP_CLASS}>
      <div className={PAGE_CLASS}>
        <h2 id="games-title" className={`${BLOCK_TITLE_CLASS} text-ink`}>
          {GAMES_TITLE}
        </h2>
        <p className={`${PROSE_CLASS} mt-7`}>{GAMES_LEDE}</p>
        <table className="mt-12 w-full border-collapse text-[16px] lg:mt-16">
          <caption
            className={`${TITLE_CLASS} pb-4 text-left text-[clamp(1.75rem,2.4vw,2.5rem)] text-ink`}
          >
            {franchise.name}
          </caption>
          <thead>
            <tr>
              <th scope="col" className={`${HEAD} w-12 text-right`}>
                {GAMES_COLUMNS.rank}
              </th>
              <th scope="col" className={HEAD}>
                {GAMES_COLUMNS.game}
              </th>
              <th scope="col" className={HEAD}>
                {GAMES_COLUMNS.released}
              </th>
              <th scope="col" className={HEAD}>
                {GAMES_COLUMNS.hours}
              </th>
              <th scope="col" className={`${HEAD} hidden sm:table-cell`}>
                {GAMES_COLUMNS.platform}
              </th>
            </tr>
          </thead>
          {sections.map((section) => (
            <tbody key={section.arc?.id ?? "all"}>
              {section.arc ? (
                <tr>
                  <th
                    scope="rowgroup"
                    colSpan={5}
                    className={`${TITLE_CLASS} px-4 pt-7 pb-2 text-left text-[26px] text-ink`}
                  >
                    {section.arc.name}
                  </th>
                </tr>
              ) : null}
              {section.entries.map(({ game }) => (
                <tr key={game.id}>
                  <td className={`${CELL} ${NUM_CLASS} text-right text-muted`}>{game.order}</td>
                  <th scope="row" className={`${CELL} text-left font-semibold`}>
                    {game.title}
                    {game.starter ? (
                      <span className="mt-1.5 block w-fit rounded-full bg-accent px-2.5 py-0.5 font-semibold text-[13px] text-accent-ink sm:mt-0 sm:ml-2.5 sm:inline-block">
                        {GAMES_START}
                      </span>
                    ) : null}
                    <span className="mt-1 block font-normal text-[14px] text-muted">
                      {TIER_LABEL[game.tier]}
                    </span>
                  </th>
                  <td className={`${CELL} ${NUM_CLASS}`}>{game.year}</td>
                  <td className={`${CELL} ${NUM_CLASS}`}>
                    {game.hours === null ? GAMES_HOURS_UNKNOWN : game.hours}
                  </td>
                  <td className={`${CELL} hidden text-muted sm:table-cell`}>
                    {game.version}, {game.platform}
                  </td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>
        <p className="mt-8">
          <Link href="/games" className={TEXT_LINK_CLASS}>
            {GAMES_ALL_LINK}
          </Link>
        </p>
      </div>
    </section>
  );
}
