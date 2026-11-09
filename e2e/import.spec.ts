import { expect, type Page, test } from "@playwright/test";
import { gotoClean, openFranchise } from "./helpers";

const TITLE = "Half-Life: Alyx";

const statusSelect = (page: Page) => page.getByLabel(`Status — ${TITLE}`, { exact: true });

test.describe("importing this browser's marks", () => {
  test.skip(
    !process.env.DATABASE_URL,
    "DATABASE_URL is not set, so sign-up and the import cannot reach a database.",
  );

  test("sign up, import, then the marks come back from the account alone", async ({ page }) => {
    await gotoClean(page);
    await openFranchise(page, /^Half-Life/);
    await statusSelect(page).selectOption("completed");

    const hydrated = page.waitForResponse("**/api/v1/auth-providers");
    await page.goto("/sign-up");
    await hydrated;
    await page.getByLabel("Name", { exact: true }).fill("E2E Import");
    await page
      .getByLabel("Email", { exact: true })
      .fill(`e2e-import-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`);
    await page
      .getByLabel("Password", { exact: true })
      .fill(`correct horse ${Math.random().toString(36).slice(2)} battery`);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("button", { name: "Account menu" })).toBeVisible();

    await page.goto("/games");
    const question = page.getByText("Import 1 mark from this browser into your account?");
    await expect(question).toBeVisible();
    const imported = page.waitForResponse("**/api/v1/import/local");
    await page.getByRole("button", { name: "Import", exact: true }).click();
    expect((await imported).status()).toBe(200);
    // exact: a franchise card mentions "has never been released", which a substring match finds.
    await expect(page.getByRole("button", { name: "Never", exact: true })).toHaveCount(0);

    // Nothing left in this browser: whatever shows now was read back from the account.
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await openFranchise(page, /^Half-Life/);
    await expect(statusSelect(page)).toHaveValue("completed");
  });
});
