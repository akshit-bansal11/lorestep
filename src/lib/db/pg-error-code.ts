/**
 * The Postgres SQLSTATE behind a failed query, or undefined. Drizzle wraps the driver's error, so
 * the `code` sits on the error or a few `cause` links down.
 */
export function pgErrorCode(error: unknown): string | undefined {
  let current = error;
  for (let depth = 0; depth < 4; depth += 1) {
    if (typeof current !== "object" || current === null) return undefined;
    if ("code" in current && typeof current.code === "string") return current.code;
    current = "cause" in current ? current.cause : undefined;
  }
  return undefined;
}
