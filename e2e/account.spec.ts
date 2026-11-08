import { expect, type Page, test } from "@playwright/test";

/** Waits for the providers request the auth forms fire on mount, so clicks land after hydration. */
async function openAuth(page: Page, path: string): Promise<void> {
  const hydrated = page.waitForResponse("**/api/v1/auth-providers");
  await page.goto(path);
  await hydrated;
}

test.describe("account erasure", () => {
  test.skip(
    !process.env.DATABASE_URL,
    "DATABASE_URL is not set, so sign-up cannot reach a database.",
  );

  test("deleting the account removes the ability to sign in", async ({ page }) => {
    const email = `e2e-erase-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
    const password = `correct horse ${Math.random().toString(36).slice(2)} battery`;

    await openAuth(page, "/sign-up");
    await page.getByLabel("Name", { exact: true }).fill("Erase User");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("button", { name: "Account menu" })).toBeVisible();

    await page.goto("/account");
    const erase = page.getByRole("button", { name: "Delete account and all data" });
    await expect(erase).toBeDisabled();
    await page.getByLabel(`Type ${email} to confirm`).fill(email);
    await erase.click();
    await expect(page).toHaveURL("/");

    await page.goto("/account");
    await expect(page).toHaveURL(/\/sign-in\?next=%2Faccount|\/sign-in\?next=\/account/);

    await openAuth(page, "/sign-in");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("alert").filter({ hasText: /./ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Account menu" })).toHaveCount(0);
  });
});
