import { beforeEach, describe, expect, it, vi } from "vitest";
import { LIBRARY_VIEW_STORAGE_KEY } from "@/constants/canon/storage";
import {
  getLibraryViewSnapshot,
  setLibraryView,
  subscribeLibraryView,
} from "@/utils/log/library-view-store";

describe("library view store", () => {
  beforeEach(() => localStorage.clear());

  it("defaults to the table", () => {
    expect(getLibraryViewSnapshot()).toBe("table");
  });

  it("reads a valid stored view", () => {
    localStorage.setItem(LIBRARY_VIEW_STORAGE_KEY, "cards");
    expect(getLibraryViewSnapshot()).toBe("cards");
  });

  it("falls back to the table for an unknown stored value", () => {
    localStorage.setItem(LIBRARY_VIEW_STORAGE_KEY, "grid");
    expect(getLibraryViewSnapshot()).toBe("table");
  });

  it("persists a choice and notifies subscribers", () => {
    const listener = vi.fn();
    const off = subscribeLibraryView(listener);
    setLibraryView("list");
    expect(getLibraryViewSnapshot()).toBe("list");
    expect(listener).toHaveBeenCalledTimes(1);
    off();
  });
});
