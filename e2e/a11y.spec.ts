import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { gotoClean } from "./helpers";

const WCAG_TAGS = ["wcag2a", "wcag2aa"];

/** Violations reduced to rule id + offending selectors, so a failure report names the defect. */
async function scan(page: Page): Promise<{ id: string; targets: string[] }[]> {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  return results.violations.map((violation) => ({
    id: violation.id,
    targets: violation.nodes.map((node) => node.target.join(" ")),
  }));
}

test.beforeEach(async ({ page }) => {
  await gotoClean(page);
});

test("the games view has no WCAG A/AA violations", async ({ page }) => {
  expect(await scan(page)).toEqual([]);
});
