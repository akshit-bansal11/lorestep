import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const WCAG_TAGS = ["wcag2a", "wcag2aa"];

// The home page and the screen routes read the database at build time, like the games view;
// /about and /docs do not. The home page is here because its empty Books card once failed
// contrast with no spec to notice.
for (const path of ["/", "/screen", "/screen/mcu", "/about", "/docs"]) {
  for (const colorScheme of ["light", "dark"] as const) {
    test(`${path} has no WCAG A/AA violations in the ${colorScheme} theme`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

      const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
      expect(results.violations.map((violation) => violation.id)).toEqual([]);
    });
  }
}

test("every docs contents link lands on a section", async ({ page }) => {
  await page.goto("/docs");
  const links = page.getByRole("navigation", { name: "On this page" }).getByRole("link");

  for (const href of await links.evaluateAll((anchors) =>
    anchors.map((anchor) => anchor.getAttribute("href") ?? ""),
  )) {
    await expect(page.locator(href)).toHaveCount(1);
  }
});

test("the footer links to About and Docs", async ({ page }) => {
  await page.goto("/about");
  const footer = page.getByRole("navigation", { name: "Site" });

  await footer.getByRole("link", { name: "Docs" }).click();
  await expect(page).toHaveURL(/\/docs$/);
  await expect(page.getByRole("heading", { level: 1, name: "Docs" })).toBeVisible();
});

test("the header switches the theme on a content page", async ({ page }) => {
  await page.goto("/about");
  const before = await page.evaluate(() => document.documentElement.dataset.theme ?? "");

  await page.getByRole("button", { name: /^Switch to/ }).click();

  await expect
    .poll(() => page.evaluate(() => document.documentElement.dataset.theme ?? ""))
    .not.toBe(before);
});

test("the header marks the current section", async ({ page }) => {
  await page.goto("/docs");
  const sections = page.getByRole("navigation", { name: "Sections" });

  await expect(sections.getByRole("link", { name: "Docs" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(sections.getByRole("link", { name: "About" })).not.toHaveAttribute("aria-current");
});
