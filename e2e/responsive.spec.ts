import { expect, type Page, test } from "@playwright/test";

/** Phone, large phone, tablet, laptop, desktop and wide desktop. */
const WIDTHS = [360, 390, 768, 1024, 1440, 1920] as const;
const CONTENT_PAGES = ["/", "/screen", "/screen/mcu", "/about", "/docs"] as const;

const overflowsSideways = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);

for (const width of WIDTHS) {
  test.describe(`at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });

    /**
     * The games view is a fixed shell whose table scrolls inside itself. If any toolbar row
     * cannot wrap, the whole document scrolls sideways under it instead.
     */
    test("a franchise table does not scroll the page sideways", async ({ page }) => {
      await page.goto("/games#/witcher");
      await expect(page.getByRole("table")).toBeVisible();
      expect(await overflowsSideways(page)).toBe(false);
    });

    test("the content pages do not scroll sideways", async ({ page }) => {
      for (const path of CONTENT_PAGES) {
        await page.goto(path);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        expect(await overflowsSideways(page)).toBe(false);
      }
    });
  });
}

/**
 * The pages were once a 768px column at every size, a thin strip down the middle of a desktop
 * screen. On a wide screen the main content should span most of the viewport.
 */
test.describe("on a wide screen", () => {
  test.use({ viewport: { width: 1920, height: 1000 } });

  test("the content pages use the width", async ({ page }) => {
    for (const path of CONTENT_PAGES) {
      await page.goto(path);
      const width = await page
        .getByRole("main")
        .evaluate((main) => main.getBoundingClientRect().width);
      expect(width, path).toBeGreaterThan(1920 * 0.8);
    }
  });
});
