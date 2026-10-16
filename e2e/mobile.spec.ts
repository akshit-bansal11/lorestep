import { expect, type Page, test } from "@playwright/test";

test.use({ viewport: { width: 375, height: 800 } });

const overflowsSideways = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);

/**
 * The games view is a fixed shell whose table scrolls inside itself. If any toolbar row cannot
 * wrap, the whole document scrolls sideways under it instead, which is what this guards against.
 */
test("a franchise table does not scroll the page sideways at phone width", async ({ page }) => {
  await page.goto("/games#/witcher");
  await expect(page.getByRole("table")).toBeVisible();

  expect(await overflowsSideways(page)).toBe(false);
});

test("the content pages do not scroll sideways at phone width", async ({ page }) => {
  for (const path of ["/about", "/docs"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await overflowsSideways(page)).toBe(false);
  }
});
