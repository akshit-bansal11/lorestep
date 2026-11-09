import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

test.describe("the signed-in library", () => {
  test.skip(
    !process.env.DATABASE_URL,
    "DATABASE_URL is not set, so sign-up cannot reach a database.",
  );

  /** Stand-ins for the third-party providers, so the add flow does not need their API keys. */
  async function stubProviders(page: Page): Promise<void> {
    await page.route("**/api/v1/search?*", (route) =>
      route.fulfill({
        json: {
          data: [
            {
              id: "438631",
              title: "Dune",
              image: null,
              year: "2021",
              type: "movie",
              overview: "",
              rating: null,
            },
          ],
        },
      }),
    );
    await page.route("**/api/v1/metadata?*", (route) =>
      route.fulfill({ json: { data: { title: "Dune", year: "2021" }, cached: false } }),
    );
  }

  async function signUp(page: Page): Promise<void> {
    const email = `e2e-lib-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
    const hydrated = page.waitForResponse("**/api/v1/auth-providers");
    await page.goto("/sign-up");
    await hydrated;
    await page.getByLabel("Name", { exact: true }).fill("Library User");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page
      .getByLabel("Password", { exact: true })
      .fill(`correct horse ${Math.random().toString(36).slice(2)} battery`);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("button", { name: "Account menu" })).toBeVisible();
  }

  test("signed out, /library sends you to sign in", async ({ page }) => {
    await page.goto("/library");
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("first run, add, edit, reload, delete and undo", async ({ page }) => {
    await stubProviders(page);
    await signUp(page);
    await page.goto("/library");

    // First run: an empty state whose one action is to add a title.
    await expect(page.getByRole("heading", { name: "Nothing here yet" })).toBeVisible();
    expect(
      (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations,
    ).toEqual([]);

    // Add through search. The dialog is native, so focus lands in its search field.
    await page.getByRole("button", { name: "Add title" }).first().click();
    const search = page.getByLabel("Title to search for");
    await expect(search).toBeFocused();
    await search.fill("dune");
    await page.getByRole("button", { name: /^Dune/ }).click();
    await expect(page.getByRole("status").filter({ hasText: "Added Dune" })).toBeVisible();
    const row = page.getByRole("button", { name: "Edit Dune" });
    await expect(row).toBeVisible();

    // Edit: status and rating, saved together.
    await row.click();
    const drawer = page.getByRole("dialog", { name: "Edit Dune" });
    await expect(drawer).toBeVisible();
    await drawer.getByLabel("Status", { exact: true }).selectOption("completed");
    await drawer.getByLabel("Rating (1 to 10)").fill("9");
    await drawer.getByRole("button", { name: "Save changes" }).click();
    await expect(drawer).toBeHidden();
    await expect(page.getByRole("row", { name: /Dune/ })).toContainText("Completed");

    // The edit is on the server, not just in the page.
    await page.reload();
    await expect(page.getByRole("row", { name: /Dune/ })).toContainText("9");

    // Delete, then undo within the window.
    await page.getByRole("button", { name: "Edit Dune" }).click();
    const editor = page.getByRole("dialog", { name: "Edit Dune" });
    await editor.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Deleted Dune" })).toBeVisible();
    const undo = page.getByRole("button", { name: "Undo" });
    await expect(undo).toBeFocused();
    await expect(page.getByRole("button", { name: "Edit Dune" })).toBeHidden();
    await undo.click();
    await expect(page.getByRole("button", { name: "Edit Dune" })).toBeVisible();
  });

  test("an invalid rating is named inline and keeps what was typed", async ({ page }) => {
    await stubProviders(page);
    await signUp(page);
    await page.goto("/library");
    await page.getByRole("button", { name: "Add title" }).first().click();
    await page.getByLabel("Title to search for").fill("dune");
    await page.getByRole("button", { name: /^Dune/ }).click();
    await page.getByRole("button", { name: "Edit Dune" }).click();

    const drawer = page.getByRole("dialog", { name: "Edit Dune" });
    const rating = drawer.getByLabel("Rating (1 to 10)");
    await rating.fill("11");
    await drawer.getByRole("button", { name: "Save changes" }).click();
    await expect(rating).toHaveAccessibleDescription(/whole number from 1 to 10/);
    await expect(rating).toHaveValue("11");
  });

  test("offline, a load failure is retryable and the page says so", async ({ page, context }) => {
    await signUp(page);
    await page.goto("/library");
    await expect(page.getByRole("heading", { name: "Nothing here yet" })).toBeVisible();

    await context.setOffline(true);
    await page.getByRole("button", { name: "Movies" }).click();
    await page.getByRole("button", { name: "Series" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "offline" })).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "You are offline" })).toBeVisible();

    await context.setOffline(false);
    await page.getByRole("button", { name: "Retry" }).click();
    await expect(page.getByRole("heading", { name: "Nothing here yet" })).toBeVisible();
  });
});
