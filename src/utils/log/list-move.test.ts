import { describe, expect, it } from "vitest";

import { moveItem } from "@/utils/log/list-move";

describe("moveItem", () => {
  it("swaps with the next neighbour", () => {
    expect(moveItem(["a", "b", "c"], 0, 1)).toEqual(["b", "a", "c"]);
  });

  it("swaps with the previous neighbour", () => {
    expect(moveItem(["a", "b", "c"], 2, -1)).toEqual(["a", "c", "b"]);
  });

  it("returns the same array at either end", () => {
    const items = ["a", "b"];
    expect(moveItem(items, 0, -1)).toBe(items);
    expect(moveItem(items, 1, 1)).toBe(items);
  });

  it("does not mutate its input", () => {
    const items = ["a", "b"];
    moveItem(items, 0, 1);
    expect(items).toEqual(["a", "b"]);
  });
});
