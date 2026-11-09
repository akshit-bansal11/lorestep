/** The list member equal to `value`, or null: narrows a form string to a literal with no cast. */
export function pick<T extends string>(list: readonly T[], value: string): T | null {
  return list.find((item) => item === value) ?? null;
}
