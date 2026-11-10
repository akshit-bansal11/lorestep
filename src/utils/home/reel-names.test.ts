import { describe, expect, it } from "vitest";
import type { Franchise } from "@/types/canon/canon";
import type { ScreenFranchise } from "@/types/canon/screen";
import { REEL_GAME_COUNT, reelNames } from "@/utils/home/reel-names";

function makeFranchise(name: string, gameCount: number): Franchise {
  const games = Array.from({ length: gameCount }, (_, index) => ({
    id: `${name}-${index}`,
    order: index + 1,
    title: `${name} ${index}`,
    year: 2000,
    version: "PC",
    platform: "PC",
    msrp: "$9.99",
    hours: 10,
    tier: "core" as const,
    starter: false,
    store: "pc" as const,
    query: name,
    storefront: "Steam",
    note: "",
    editions: [],
  }));
  return { id: name, name, scope: "", caveat: "", games };
}

function makeScreen(title: string, order: number): ScreenFranchise {
  return { id: title, order, title, description: "", source: "", groups: [], entries: [] };
}

describe("reelNames", () => {
  it("takes the franchises with the most games, then every screen title", () => {
    const franchises = Array.from({ length: REEL_GAME_COUNT + 6 }, (_, index) =>
      makeFranchise(`F${String(index).padStart(2, "0")}`, index + 1),
    );
    const names = reelNames(franchises, [makeScreen("Star Wars", 2), makeScreen("MCU", 1)]);

    expect(names).toHaveLength(REEL_GAME_COUNT + 2);
    expect(names[0]).toBe("F29");
    expect(names).not.toContain("F00");
    expect(names.slice(-2)).toEqual(["MCU", "Star Wars"]);
  });

  it("breaks ties by name and gives the same answer on every call", () => {
    const franchises = [makeFranchise("B", 3), makeFranchise("A", 3), makeFranchise("C", 3)];

    expect(reelNames(franchises, [])).toEqual(["A", "B", "C"]);
    expect(reelNames([...franchises].reverse(), [])).toEqual(["A", "B", "C"]);
  });

  it("drops duplicate names", () => {
    expect(reelNames([makeFranchise("Zelda", 1)], [makeScreen("Zelda", 1)])).toEqual(["Zelda"]);
  });
});
