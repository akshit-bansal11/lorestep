import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Neon signs the real query; these pages only check its shape, so a fake one reaches them. The
// full round trip (Neon authorize to the extension redirect) is the user spike, PLAN.md 12.4 step 11.
const QUERY = "client_id=ci&scope=openid+email&sig=e2e-signature";

test("the OAuth pages say the link expired without a signed request for us", async ({ page }) => {
  const foreign = "client_id=other-app&scope=openid+email&sig=e2e-signature";
  for (const path of [
    "/oauth/login",
    "/oauth/consent",
    "/oauth/login?next=%2Flibrary",
    `/oauth/login?${foreign}`,
    `/oauth/consent?${foreign}`,
  ]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { level: 1, name: "This link has expired" }),
    ).toBeVisible();
  }
});

test("consent signed out hands the same request to the OAuth login page", async ({ page }) => {
  await page.goto(`/oauth/consent?${QUERY}`);
  await page.waitForURL("**/oauth/login?**");
  expect(new URL(page.url()).search).toBe(`?${QUERY}`);
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
});

test("the OAuth login page has no WCAG A/AA violations", async ({ page }) => {
  const hydrated = page.waitForResponse("**/api/v1/auth-providers");
  await page.goto(`/oauth/login?${QUERY}`);
  await hydrated;
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations.map((violation) => violation.id)).toEqual([]);
});
