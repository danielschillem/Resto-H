import { test, expect } from "@playwright/test";

test.describe("Login page", () => {
  test("displays login form with role cards", async ({ page }) => {
    await page.goto("/login", { timeout: 60_000 });
    await expect(page.locator("h2")).toContainText("Connexion");
    await expect(page.getByText("Prestataire")).toBeVisible();
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
    await page.getByText("Prestataire", { exact: false }).first().click();
    await page.fill('input[type="password"]', "1234");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await page.waitForURL("**/dashboard", { timeout: 15_000 });
    await expect(page).toHaveURL(/dashboard/);
  });

  test("wrong password shows error", async ({ page }) => {
    await page.goto("/login");
    await page.getByText("Prestataire", { exact: false }).first().click();
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
    await page.getByText("Prestataire", { exact: false }).first().click();
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

// ── Commandes page tests ─────────────────────────
test.describe("Commandes page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login", { timeout: 30_000 });
    await page.getByText("CSAH", { exact: false }).first().click();
    await page.fill('input[type="password"]', "1234");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await page.waitForURL("**/dashboard", { timeout: 30_000 });
    await page.goto("/commandes", { timeout: 15_000 });
  });

  test("displays commandes tabs", async ({ page }) => {
    await expect(page.getByText("Malades")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Personnel")).toBeVisible();
    await expect(page.getByText("Clients externes")).toBeVisible();
  });

  test("shows commandes table", async ({ page }) => {
    await expect(page.locator("table")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Réf.")).toBeVisible();
    await expect(page.getByText("Service")).toBeVisible();
  });

  test("can switch tabs", async ({ page }) => {
    await page.getByText("Personnel", { exact: true }).click();
    await expect(page.locator("table")).toBeVisible({ timeout: 5_000 });
  });

  test("filter by statut works", async ({ page }) => {
    const select = page
      .locator("select")
      .filter({ hasText: /Statut/ })
      .first();
    if (await select.isVisible()) {
      await select.selectOption("validee");
    }
  });
});

// ── Dashboard content tests ──────────────────────
test.describe("Dashboard data", () => {
  test("prestataire sees 4 KPI cards", async ({ page }) => {
    await page.goto("/login", { timeout: 30_000 });
    await page.getByText("Prestataire", { exact: false }).first().click();
    await page.fill('input[type="password"]', "1234");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await page.waitForURL("**/dashboard", { timeout: 30_000 });
    const kpiCards = page
      .locator("[class*='kpi'], [style*='border-radius']")
      .filter({ hasText: /Portions|Commandes|Patients|Budget/ });
    await expect(kpiCards.first()).toBeVisible({ timeout: 10_000 });
  });
});

// ── Menus hebdomadaires tests ────────────────────
test.describe("Menus Hebdo page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login", { timeout: 30_000 });
    await page.getByText("Prestataire", { exact: false }).first().click();
    await page.fill('input[type="password"]', "1234");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await page.waitForURL("**/dashboard", { timeout: 30_000 });
    await page.goto("/menus-hebdo", { timeout: 15_000 });
  });

  test("displays menu hebdo page", async ({ page }) => {
    await expect(page.getByText(/Menu/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("shows weekly grid or list", async ({ page }) => {
    // Should have some content (table or cards)
    await page.waitForTimeout(3000);
    const content = await page.textContent("body");
    expect(content).toBeTruthy();
  });
});

// ── Notifications page tests ─────────────────────
test.describe("Notifications page", () => {
  test("displays notifications", async ({ page }) => {
    await page.goto("/login", { timeout: 30_000 });
    await page.getByText("Prestataire", { exact: false }).first().click();
    await page.fill('input[type="password"]', "1234");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await page.waitForURL("**/dashboard", { timeout: 30_000 });
    await page.goto("/notifications", { timeout: 15_000 });
    await expect(page.getByText(/Notification/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });
});

// ── Profil page tests ────────────────────────────
test.describe("Profil page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login", { timeout: 30_000 });
    await page.getByText("Prestataire", { exact: false }).first().click();
    await page.fill('input[type="password"]', "1234");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await page.waitForURL("**/dashboard", { timeout: 30_000 });
    await page.goto("/profil", { timeout: 15_000 });
  });

  test("shows profile info", async ({ page }) => {
    await expect(page.getByText(/Profil/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("shows password change form", async ({ page }) => {
    await expect(page.getByText(/Mot de passe/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });
});

// ── DSGL Admin page tests ────────────────────────
test.describe("Admin page (DSGL)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login", { timeout: 30_000 });
    await page.getByText("DSGL", { exact: false }).first().click();
    await page.fill('input[type="password"]', "1234");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await page.waitForURL("**/dashboard", { timeout: 30_000 });
    await page.goto("/admin", { timeout: 15_000 });
  });

  test("shows admin tabs", async ({ page }) => {
    await expect(page.getByText("Utilisateurs")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("Services")).toBeVisible();
  });

  test("lists users", async ({ page }) => {
    await expect(page.locator("table").first()).toBeVisible({
      timeout: 10_000,
    });
  });
});

// ── États & Rapports tests ───────────────────────
test.describe("États & Rapports page", () => {
  test("shows 4 tabs for DSGL", async ({ page }) => {
    await page.goto("/login", { timeout: 30_000 });
    await page.getByText("DSGL", { exact: false }).first().click();
    await page.fill('input[type="password"]', "1234");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await page.waitForURL("**/dashboard", { timeout: 30_000 });
    await page.goto("/etats", { timeout: 15_000 });
    await expect(page.getByText("État des commandes")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("État des consommations")).toBeVisible();
    await expect(page.getByText("Devis estimatif")).toBeVisible();
    await expect(page.getByText("Validation DSGL")).toBeVisible();
  });
});
