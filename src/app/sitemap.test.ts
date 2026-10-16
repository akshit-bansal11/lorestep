import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/queries", () => ({
  listScreen: vi.fn(async () => [{ id: "mcu" }, { id: "star-wars" }]),
}));

import sitemap from "@/app/sitemap";
import { SITE_URL, STATIC_ROUTES } from "@/constants/site";

describe("sitemap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists every static route and every chronology on the canonical host", async () => {
    const urls = (await sitemap()).map((entry) => entry.url);

    expect(urls).toEqual([
      ...STATIC_ROUTES.map((route) => `${SITE_URL}${route}`),
      `${SITE_URL}/screen/mcu`,
      `${SITE_URL}/screen/star-wars`,
    ]);
    expect(urls.every((url) => url.startsWith("https://lorestep.akshitbansal.dev/"))).toBe(true);
  });
});
