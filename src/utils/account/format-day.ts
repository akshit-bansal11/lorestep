const DAY_FORMAT = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" });

/** An ISO timestamp as "8 Nov 2026" (UTC, fixed locale, so server and client render the same). */
export function formatDay(iso: string): string {
  return DAY_FORMAT.format(new Date(iso));
}
