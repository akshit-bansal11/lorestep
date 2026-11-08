import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

test.describe("the signed-in lists", () => {
  test.skip(
    !process.env.DATABASE_URL,
    "DATABASE_URL is not set, so sign-up cannot reach a database.",
  );

  /** A stand-in for the search provider, so adding a title does not need its API key. */
  async function stubSearch(page: Page): Promise<void> {
    await page.route("**/api/v1/search?*", (route) => {
      const q = new URL(route.request().url()).searchParams.get("q") ?? "";
      return route.fulfill({
        json: {
          data: [
            {
              id: q === "Dune" ? "438631" : "693134",
              title: q,
              image: null,
              year: "2021",
              type: "movie",
              overview: "",
              rating: null,
            },
          ],
        },
      });
    });
  }

  async function signUp(page: Page): Promise<void> {
    const email = `e2e-lists-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
    const hydrated = page.waitForResponse("**/api/v1/auth-providers");
    await page.goto("/sign-up");
    await hydrated;
    await page.getByLabel("Name", { exact: true }).fill("Lists User");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page
      .getByLabel("Password", { exact: true })
      .fill(`correct horse ${Math.random().toString(36).slice(2)} battery`);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("button", { name: "Account menu" })).toBeVisible();
  }

  async function addTitle(page: Page, title: string): Promise<void> {
    await page.getByRole("button", { name: "Add title" }).first().click();
    await page.getByLabel("Title to search for").fill(title);
    await page.getByRole("button", { name: `Add ${title}` }).click();
    await expect(page.getByText(`Added ${title}.`)).toBeVisible();
    await page.getByRole("button", { name: "Done" }).click();
  }

  test("signed out, /lists sends you to sign in", async ({ page }) => {
    await page.goto("/lists");
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("first run, create, add, reorder and delete", async ({ page }) => {
    await stubSearch(page);
    await signUp(page);
    await page.goto("/lists");

    // First run: an empty state whose one action is to create a list.
    await expect(page.getByRole("heading", { name: "No lists yet" })).toBeVisible();
    const empty = await new AxeBuilder({ page }).analyze();
    expect(empty.violations).toEqual([]);

    await page.getByRole("button", { name: "Create your first list" }).click();
    await page.getByLabel("Name", { exact: true }).fill("Weekend marathon");
    await page.getByRole("button", { name: "Create list" }).click();
    await expect(page.getByText("Created Weekend marathon.")).toBeVisible();
    await page.getByRole("link", { name: /Weekend marathon/ }).click();
    await expect(page.getByRole("heading", { name: "Weekend marathon" })).toBeVisible();

    await expect(page.getByRole("heading", { name: "This list is empty" })).toBeVisible();
    await addTitle(page, "Dune");
    await page.getByRole("button", { name: "Add title" }).first().click();
    await page.getByLabel("Title to search for").fill("Arrival");
    await page.getByRole("button", { name: "Add Arrival" }).click();
    await expect(page.getByText("Added Arrival.")).toBeVisible();
    await page.getByRole("button", { name: "Done" }).click();

    const rows = page.getByRole("list", { name: "Titles in order" }).getByRole("listitem");
    await expect(rows).toHaveCount(2);
    await expect(rows.first()).toContainText("Dune");

    // Reorder by button, announced, and the order survives a reload.
    await page.getByRole("button", { name: "Move up Arrival" }).click();
    await expect(page.getByText("Moved Arrival to position 1 of 2.")).toBeVisible();
    await expect(rows.first()).toContainText("Arrival");
    await page.reload();
    await expect(rows.first()).toContainText("Arrival");

    const detail = await new AxeBuilder({ page }).analyze();
    expect(detail.violations).toEqual([]);

    await page.getByRole("button", { name: "Remove Dune" }).click();
    await expect(rows).toHaveCount(1);

    // Delete the list: the confirm names it, and the overview is empty again.
    await page.getByRole("button", { name: "Delete list" }).click();
    await page.getByRole("button", { name: "Delete list Weekend marathon" }).click();
    await expect(page).toHaveURL(/\/lists$/);
    await expect(page.getByRole("heading", { name: "No lists yet" })).toBeVisible();
  });
});
