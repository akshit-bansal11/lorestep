import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

const WCAG_TAGS = ["wcag2a", "wcag2aa"];

/**
 * Opens an auth page and waits for the providers request, which the forms fire on mount: a click
 * before hydration would submit the form natively, putting the password in the URL.
 */
async function open(page: Page, path: string): Promise<void> {
  const hydrated = page.waitForResponse("**/api/v1/auth-providers");
  await page.goto(path);
  await hydrated;
}

async function violations(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  return results.violations.map((violation) => violation.id);
}

for (const path of ["/sign-in", "/sign-up", "/reset-password"]) {
  test(`${path} has no WCAG A/AA violations`, async ({ page }) => {
    await open(page, path);
    expect(await violations(page)).toEqual([]);
  });
}

test("invalid input is reported inline, linked to the field, and focuses the first one", async ({
  page,
}) => {
  await open(page, "/sign-up");
  await page.getByRole("button", { name: "Create account" }).click();

  const name = page.getByLabel("Name", { exact: true });
  await expect(name).toBeFocused();
  await expect(name).toHaveAttribute("aria-invalid", "true");
  await expect(name).toHaveAccessibleDescription(/Enter a name/);

  await name.fill("Ada");
  await page.getByLabel("Email", { exact: true }).fill("ada@example.com");
  await page.getByLabel("Password", { exact: true }).fill("too short");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAccessibleDescription(
    /at least 15 characters/i,
  );
});

test.describe("with a database behind the app", () => {
  test.skip(
    !process.env.DATABASE_URL,
    "DATABASE_URL is not set, so sign-up cannot reach a database.",
  );

  test("sign up, sign out, sign in, and both failures read the same", async ({ page }) => {
    const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
    const password = `correct horse ${Math.random().toString(36).slice(2)} battery`;

    await open(page, "/sign-up");
    await page.getByLabel("Name", { exact: true }).fill("E2E User");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Create account" }).click();

    const menu = page.getByRole("button", { name: "Account menu" });
    await expect(menu).toBeVisible();
    await menu.click();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();

    await open(page, "/sign-in");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill("not the right password at all");
    await page.getByRole("button", { name: "Sign in" }).click();
    const wrongPassword = await page.getByRole("alert").filter({ hasText: /./ }).innerText();

    await page.getByLabel("Email", { exact: true }).fill(`nobody-${email}`);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("alert").filter({ hasText: wrongPassword })).toBeVisible();

    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("button", { name: "Account menu" })).toBeVisible();
  });
});
