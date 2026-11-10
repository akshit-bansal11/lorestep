import Link from "next/link";

import {
  BLOCK_TITLE_CLASS,
  NUM_CLASS,
  PAGE_CLASS,
  SECTION_GAP_CLASS,
  TITLE_CLASS,
} from "@/constants/canon/ui";
import { HOME_WAYS } from "@/constants/home/copy";
import { BOOKS_EMPTY, WAYS_TITLE } from "@/constants/home/sections";
import { WAYS_SPAN, WAYS_TONE } from "@/constants/home/ways-tone";
import type { ThreeWaysProps } from "@/types/home/three-ways";

export default function ThreeWays({ counts }: ThreeWaysProps) {
  const facts = [
    { label: "Movies and series", value: `${counts.screen.entries} titles` },
    { label: "Games", value: `${counts.games.entries} games` },
    {
      label: "Books",
      value: counts.books.entries === 0 ? BOOKS_EMPTY : `${counts.books.entries} titles`,
    },
  ];

  return (
    <section aria-labelledby="ways-title" className={SECTION_GAP_CLASS}>
      <div className={PAGE_CLASS}>
        <h2 id="ways-title" className={`${BLOCK_TITLE_CLASS} text-ink`}>
          {WAYS_TITLE}
        </h2>
        <ul className="mt-12 grid gap-4 lg:mt-20 lg:grid-cols-12">
          {HOME_WAYS.map((way, index) => {
            const tone = WAYS_TONE[way.id];
            return (
              <li key={way.id} className={WAYS_SPAN[index]}>
                <Link
                  href={way.href}
                  className={`${tone.tile} flex min-h-[28rem] flex-col gap-4 rounded-overlay p-6 transition-transform duration-[260ms] ease-out hover:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0 lg:h-full lg:p-10`}
                >
                  <span className={`${TITLE_CLASS} text-[clamp(2rem,3vw,3.25rem)]`}>
                    {way.title}
                  </span>
                  <span className={`${tone.body} max-w-[34ch] text-[17px] leading-relaxed`}>
                    {way.body}
                  </span>
                  {way.id === "watch-orders" ? (
                    <span className="mt-auto grid gap-2.5 text-[15px]">
                      {facts.map((fact) => (
                        <span key={fact.label} className="flex justify-between gap-3 pt-2.5">
                          <span className="text-muted">{fact.label}</span>
                          <b className={`${NUM_CLASS} font-semibold`}>{fact.value}</b>
                        </span>
                      ))}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
