import { describe, expect, it } from "vitest";
import type { Franchise, Game } from "@/types/canon/canon";
import { buildDemo, DEMO_FRANCHISE_IDS, releaseRank } from "@/utils/home/order-demo";

function makeGame(order: number, title: string, year: number): Game {
  return {
    id: `g${order}`,
    order,
    title,
    year,
    version: "PC",
    platform: "PC",
    msrp: "$9.99",
    hours: 10,
    tier: "core",
    starter: false,
    store: "pc",
    query: title,
    storefront: "Steam",
    note: "",
    editions: [],
  };
}

function makeFranchise(id: string, games: Game[]): Franchise {
  return { id, name: id, scope: "", caveat: "", games };
}

// Story order is deliberately not release order; the last row shares a year with story step 1.
const metalGear = makeFranchise("metal-gear", [
  makeGame(1, "Metal Gear Solid 3", 2004),
  makeGame(2, "Metal Gear Solid V", 2015),
  makeGame(3, "Metal Gear", 1987),
  makeGame(4, "Metal Gear 2: Solid Snake", 1990),
  makeGame(5, "Metal Gear Solid", 1998),
  makeGame(6, "Same Year B", 2004),
]);

function releaseTitles(): string[] {
  const [demo] = buildDemo([metalGear]);
  return releaseRank(demo?.rows ?? []).map((row) => row.title);
}

describe("buildDemo", () => {
  it("returns the franchise with rows in story order", () => {
    const [demo] = buildDemo([metalGear]);

    expect(demo?.id).toBe("metal-gear");
    expect(demo?.rows.map((row) => row.story)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(demo?.rows[0]).toEqual({
      id: "g1",
      title: "Metal Gear Solid 3",
      year: 2004,
      tier: "core",
      story: 1,
    });
  });

  it("skips ids that are missing instead of throwing", () => {
    expect(buildDemo([])).toEqual([]);
    expect(buildDemo([makeFranchise("other", [])])).toEqual([]);
  });

  it("follows DEMO_FRANCHISE_IDS order", () => {
    const supplied = [...DEMO_FRANCHISE_IDS].reverse().map((id) => makeFranchise(id, []));

    expect(buildDemo(supplied).map((demo) => demo.id)).toEqual([...DEMO_FRANCHISE_IDS]);
  });
});

describe("releaseRank", () => {
  it("sorts by release year", () => {
    expect(releaseTitles().slice(0, 3)).toEqual([
      "Metal Gear",
      "Metal Gear 2: Solid Snake",
      "Metal Gear Solid",
    ]);
  });

  it("keeps story order for games released in the same year", () => {
    const titles = releaseTitles();

    expect(titles.indexOf("Metal Gear Solid 3")).toBeLessThan(titles.indexOf("Same Year B"));
  });

  it("does not reorder its input", () => {
    const [demo] = buildDemo([metalGear]);
    const rows = demo?.rows ?? [];
    releaseRank(rows);

    expect(rows[0]?.story).toBe(1);
  });
});
