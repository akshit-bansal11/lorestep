import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const WCAG_TAGS = ["wcag2a", "wcag2aa"];

// The home page and the screen routes read the database at build time, like the games view;
// /about and /docs do not. The home page is here because its empty Books card once failed
// contrast with no spec to notice.
for (const path of ["/", "/screen", "/screen/mcu", "/about", "/docs"]) {
  test(`${path} has no WCAG A/AA violations`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    expect(results.violations.map((violation) => violation.id)).toEqual([]);
  });
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

test("the header marks the current section", async ({ page }) => {
  await page.goto("/screen");
  const sections = page.getByRole("navigation", { name: "Sections" });

  await expect(sections.getByRole("link", { name: "Watch orders" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(sections.getByRole("link", { name: "Games" })).not.toHaveAttribute("aria-current");
});

test("the home demo reorders to release order", async ({ page }) => {
  await page.goto("/");
  const first = page.locator('main li[aria-posinset="1"]');

  await expect(first).toContainText("Metal Gear Solid 3: Snake Eater");
  await page.getByRole("button", { name: "Release order" }).click();
  await expect(first).toContainText("Metal Gear");
  await expect(first).not.toContainText("Snake Eater");
});

test("the home page has exactly one Sign in link", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Sign in" })).toHaveCount(1);
});
