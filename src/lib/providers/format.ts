export const round1 = (value: number) => Math.round(value * 10) / 10;

/** Four-digit year out of "2010-07-16", "2010-2014", "2010" ... or undefined. */
export const yearOf = (value?: string | null) => value?.match(/\d{4}/)?.[0];

/** Names out of a provider list, dropping the blanks. */
export const namesOf = (items: unknown, limit = Number.POSITIVE_INFINITY): string[] =>
  Array.isArray(items)
    ? items
        .map((item: unknown) =>
          typeof item === "object" && item !== null && "name" in item ? item.name : null,
        )
        .filter((name): name is string => typeof name === "string" && name !== "")
        .slice(0, limit)
    : [];
