/** Up to two capitals from a display name, falling back to the email's first letter, then "?". */
export function initials(name: string, email: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : [parts[0] ?? email];
  const result = letters
    .map((part) => (part ?? "").charAt(0))
    .join("")
    .toUpperCase();
  return result === "" ? "?" : result;
}
