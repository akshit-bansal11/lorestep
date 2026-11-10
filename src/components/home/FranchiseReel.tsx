"use client";

import { useEffect, useRef, useState } from "react";
import { DISPLAY_CLASS, TITLE_CLASS } from "@/constants/canon/ui";
import {
  REEL_COPIES,
  REEL_LABELS,
  REEL_PAUSE_CLASS,
  REEL_PAUSE_LABEL,
  REEL_TILE_CLASS,
} from "@/constants/home/reel";
import type { FranchiseReelProps } from "@/types/home/franchise-reel-props";
import { cn } from "@/utils/cn";
import { reelTileFill } from "@/utils/home/reel-tile-fill";

/**
 * Two lanes of franchise names scrolling in opposite directions. Each lane is the real list plus
 * an `aria-hidden` copy for the seamless loop. It pauses on hover, on focus within, off-screen
 * and via the visible button; reduced motion stops it and wraps the lane (globals.css `.reel`).
 */
export default function FranchiseReel({ names, className }: FranchiseReelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [offscreen, setOffscreen] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (node === null) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry !== undefined) setOffscreen(!entry.isIntersecting);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  if (names.length === 0) return null;
  const lanes = [
    names.filter((_, index) => index % 2 === 0),
    names.filter((_, index) => index % 2 === 1),
  ];

  return (
    <div className={cn("grid gap-3", className)}>
      <div
        ref={ref}
        className="reel grid gap-3 overflow-hidden py-2"
        data-paused={paused || offscreen}
      >
        {lanes.map((lane, laneIndex) => (
          <div
            key={REEL_LABELS[laneIndex]}
            className={cn(
              "reel-lane flex w-max motion-reduce:w-auto",
              laneIndex === 1 && "reel-lane-reverse",
            )}
          >
            {REEL_COPIES.map((copy) => (
              <ul
                key={copy}
                aria-label={copy === "real" ? REEL_LABELS[laneIndex] : undefined}
                aria-hidden={copy === "copy" ? true : undefined}
                className={cn(
                  "flex gap-3 pr-3 motion-reduce:flex-wrap",
                  copy === "copy" && "motion-reduce:hidden",
                )}
              >
                {lane.map((name, index) => (
                  <li
                    key={`${copy}-${name}`}
                    className={cn(
                      REEL_TILE_CLASS,
                      index % 2 === 0 ? DISPLAY_CLASS : TITLE_CLASS,
                      reelTileFill(index),
                    )}
                  >
                    {name}
                  </li>
                ))}
              </ul>
            ))}
          </div>
        ))}
      </div>
      <button
        type="button"
        aria-pressed={paused}
        onClick={() => setPaused((value) => !value)}
        className={cn(REEL_PAUSE_CLASS, "justify-self-start")}
      >
        {REEL_PAUSE_LABEL}
      </button>
    </div>
  );
}
