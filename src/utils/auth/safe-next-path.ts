const FALLBACK = "/";

const hasControlChar = (value: string) =>
  [...value].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127);

/**
 * A `?next=` value that is safe to navigate to after sign-in: a same-origin relative path that
 * starts with a single `/`. Anything else (absolute URLs, `//host`, `/\host`, control characters
 * browsers strip before parsing) is an open redirect and becomes `/`.
 */
export function safeNextPath(raw: string | null | undefined): string {
  if (typeof raw !== "string" || !raw.startsWith("/")) return FALLBACK;
  if (raw.startsWith("//") || raw.startsWith("/\\") || hasControlChar(raw)) return FALLBACK;
  return raw;
}

/** The page's own `?next=`, checked. Call from an event handler: it reads `window`. */
export function nextPathFromLocation(): string {
  return safeNextPath(new URLSearchParams(window.location.search).get("next"));
}
