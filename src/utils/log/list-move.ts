/** `items` with the one at `index` swapped with its neighbour; the same array when it cannot move. */
export function moveItem<T>(items: readonly T[], index: number, delta: -1 | 1): readonly T[] {
  const target = index + delta;
  const a = items[index];
  const b = items[target];
  if (a === undefined || b === undefined) return items;
  const next = [...items];
  next[index] = b;
  next[target] = a;
  return next;
}
