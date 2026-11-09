import { describe, expect, it } from "vitest";
import { statusLabel } from "@/utils/log/status-label";
import { testEntry } from "@/utils/log/test-entry";

describe("statusLabel", () => {
  it("uses the kind's verb for in progress", () => {
    expect(statusLabel(testEntry({ kind: "movie", status: "in_progress" }))).toBe("Watching");
    expect(statusLabel(testEntry({ kind: "manga", status: "in_progress" }))).toBe("Reading");
    expect(statusLabel(testEntry({ kind: "game", status: "in_progress" }))).toBe("Playing");
  });

  it("names the game shelf when it says more than the status", () => {
    const game = (status: string | null, shelf: string) =>
      statusLabel(testEntry({ kind: "game", status, shelf }));
    expect(game(null, "own")).toBe("Owned");
    expect(game("planned", "own")).toBe("Backlog");
    expect(game("planned", "wishlist")).toBe("Wishlist");
    expect(game("dropped", "trash")).toBe("Not interested");
  });

  it("is empty with no status", () => {
    expect(statusLabel(testEntry({ status: null }))).toBe("");
  });
});
