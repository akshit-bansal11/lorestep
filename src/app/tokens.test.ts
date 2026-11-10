import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Re-asserts the WCAG 2.2 contrast pairs recorded in globals.css and in
// docs/design/PLAN.md section A against the hex values actually shipped.
const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
const TONE_HEX = /--tone-([a-z-]+):\s*#([0-9a-f]{3}|[0-9a-f]{6});/gi;
const tones = new Map<string, string>();
for (const [, name = "", hex = ""] of css.matchAll(TONE_HEX)) {
  tones.set(name, hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex);
}

function channel(hex: string, i: number): number {
  const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(name: string): number {
  const hex = tones.get(name);
  if (hex === undefined) throw new Error(`--tone-${name} has no hex value in globals.css`);
  return 0.2126 * channel(hex, 0) + 0.7152 * channel(hex, 2) + 0.0722 * channel(hex, 4);
}

function ratio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const GROUNDS = ["canvas", "surface", "raise", "line"];
const STATUSES = ["st-planned", "st-in-progress", "st-completed", "st-on-hold", "st-dropped"];

// [foreground, backgrounds, minimum ratio]
const PAIRS: [string, string[], number][] = [
  ["text", [...GROUNDS, "accent-soft"], 4.5],
  ["muted", [...GROUNDS, "accent-soft"], 4.5],
  ["faint", [...GROUNDS, "accent-soft"], 4.5],
  ["accent", [...GROUNDS, "accent-soft"], 4.5],
  ["accent-ink", ["accent"], 4.5],
  ["field-ink", ["field"], 4.5],
  ["accent-line", ["canvas", "surface", "raise"], 3],
  ["edge", GROUNDS, 3],
  ["st-ink", STATUSES, 4.5],
  // st-dropped doubles as --tone-danger, the alert text colour.
  ...STATUSES.map((s): [string, string[], number] => [s, GROUNDS, 4.5]),
];

describe("tone contrast", () => {
  for (const [fg, bgs, min] of PAIRS) {
    for (const bg of bgs) {
      it(`${fg} on ${bg} is at least ${min}:1`, () => {
        expect(ratio(fg, bg)).toBeGreaterThanOrEqual(min);
      });
    }
  }

  it("danger is the dropped status colour", () => {
    expect(css).toMatch(/--tone-danger:\s*var\(--tone-st-dropped\);/);
  });
});
