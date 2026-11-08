import {
  TITLE_BREAKS,
  TITLE_CLEAN_MAX,
  TITLE_FORMAT,
  TITLE_JOINERS,
  TITLE_NORM_MIN,
} from "@/constants/log/entries";

/** Port of Dogear's `cleanTitle`: strips invisible and spoofing characters, collapses spaces. */
export function cleanTitle(value: string): string {
  return value
    .replace(TITLE_BREAKS, " ")
    .replace(TITLE_FORMAT, (char) => (TITLE_JOINERS.has(char.codePointAt(0) ?? 0) ? char : ""))
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, TITLE_CLEAN_MAX);
}

/**
 * Port of Dogear's `normalize` (dogear/core/store.js): the title's matching form, stored as
 * `entries.title_norm`. "The Boys - Season 1 (Hindi)" becomes "the boys". Accents are dropped only
 * from Latin, Greek and Cyrillic; in Indic scripts the marks are vowels ("काल" vs "किल"). Only
 * season markers are stripped: "Part 2" names a different film. "" when too little is left.
 */
export function normTitle(value: string): string {
  const norm = cleanTitle(value)
    .normalize("NFKD")
    .replace(/([\p{Script=Latin}\p{Script=Greek}\p{Script=Cyrillic}])\p{M}+/gu, "$1")
    .toLowerCase()
    .replace(/\s*[([][^)\]]*[)\]]/g, " ")
    .replace(/\s*(?:[-–—:,|]\s*)?\b(?:season|series)\s*\d+\b.*$/u, "")
    .replace(/\s*(?:[-–—:,|]\s*)?\bs\d{1,2}\b.*$/u, "")
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, " ")
    .trim();
  return norm.length >= TITLE_NORM_MIN ? norm : "";
}
