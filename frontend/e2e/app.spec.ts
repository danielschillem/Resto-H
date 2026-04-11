import { test, expect } from "@playwright/test";

test.describe("Login page", () => {
  test("displays login form with role cards", async ({ page }) => {
    await page.goto("/login", { timeout: 60_000 });
    await expect(page.locator("h2")).toContainText("Connexion");
    await expect(page.getByText("Gérant")).toBeVisible();
    await expect(page.getByText("DSGL")).toBeVisible();
    await expect(page.getByText("CSAH")).toBeVisible();
    await expect(page.getByText("SUS / SUT")).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Se connecter" }),
    ).toBeVisible();
  });

  test("shows error with no role selected", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(
      page.getByText("Veuillez sélectionner un profil"),
    ).toBeVisible();
  });

  test("successful login redirects to dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.getByText("Gérant", { exact: false }).first().click();
    await page.fill('input[type="password"]', "1234");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await page.waitForURL("**/dashboard", { timeout: 15_000 });
    await expect(page).toHaveURL(/dashboard/);
  });

  test("wrong password shows error", async ({ page }) => {
    await page.goto("/login");
    await page.getByText("Gérant", { exact: false }).first().click();
    await page.fill('input[type="password"]', "wrongpassword");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page.getByText("Code d\u0027accès incorrect")).toBeVisible({
      timeout: 10_000,
    });
  });
});

test.describe("Authenticated navigation", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await page.goto("/login", { timeout: 30_000 });
    await page.getByText("Gérant", { exact: false }).first().click();
    await page.fill('input[type="password"]', "1234");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await page.waitForURL("**/dashboard", { timeout: 30_000 });
  });

  test("dashboard loads content", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /Tableau de Bord/ }),
    ).toBeVisible({ timeout: 5000 });
  });

  test("sidebar navigation to commandes", async ({ page }) => {
    await page
      .getByRole("link", { name: /Commandes/ })
      .first()
      .click();
    await page.waitForURL("**/commandes", { timeout: 10_000 });
    await expect(page).toHaveURL(/commandes/);
  });

  test("sidebar navigation to menus hebdo", async ({ page }) => {
    await page.getByRole("link", { name: /Menus/ }).first().click();
    await page.waitForURL("**/menus-hebdo", { timeout: 10_000 });
    await expect(page).toHaveURL(/menus-hebdo/);
  });

  test("logout returns to login", async ({ page }) => {
    await page.getByRole("button", { name: /Déconnexion/ }).click();
    await page.waitForURL("**/login", { timeout: 10_000 });
    await expect(page).toHaveURL(/login/);
  });
});
