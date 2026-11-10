const FORMAT = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** "10 Nov 2026" in the viewer's locale, or "" for null or an unparseable instant. */
export function formatDate(iso: string | null): string {
  if (iso === null) return "";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : FORMAT.format(date);
}
