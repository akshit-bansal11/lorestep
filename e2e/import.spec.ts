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
    // Diagnostic: React never touches an attribute it did not set, so the mark survives a
    // re-render and is gone only if the banner was remounted while the import was in flight.
    await question.evaluate((node) => node.setAttribute("data-e2e-before-import", ""));
    const imported = page.waitForResponse("**/api/v1/import/local");
    await page.getByRole("button", { name: "Import", exact: true }).click();
    expect((await imported).status()).toBe(200);
    const sameNode = (await page.locator("[data-e2e-before-import]").count()) === 1;
    // Diagnostic timeline: the stored sync record and the banner text every 250 ms, printed only
    // when the banner fails to close, so one CI run shows which state reopened the question.
    const timeline: string[] = [];
    for (let tick = 0; tick < 12; tick += 1) {
      timeline.push(
        await page.evaluate(
          (t) =>
            `${t * 250}ms record=${localStorage.getItem("isitcanon/import/v1")} banner=${
              document.querySelector('[role="status"][aria-live="polite"]')?.textContent ?? "-"
            }`,
          tick,
        ),
      );
      await page.waitForTimeout(250);
    }
    await expect(
      page.getByRole("button", { name: "Never" }),
      `import banner still open (${sameNode ? "same node" : "remounted during import"})\n${timeline.join("\n")}`,
    ).toHaveCount(0);

    // Nothing left in this browser: whatever shows now was read back from the account.
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await openFranchise(page, /^Half-Life/);
    await expect(statusSelect(page)).toHaveValue("completed");
  });
});
