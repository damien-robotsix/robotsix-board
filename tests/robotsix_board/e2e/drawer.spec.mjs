import { test, expect } from "@playwright/test";

test.describe("drawer visibility", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/tests/robotsix_board/e2e/fixtures/board.html");
    // Wait for board.js to bootstrap
    await page.waitForSelector("#board");
  });

  test("drawer is not visible initially", async ({ page }) => {
    const drawer = page.locator("#drawer");
    await expect(drawer).not.toBeInViewport();
  });

  test("drawer becomes visible after activating a card via keyboard (Enter)", async ({ page }) => {
    const card = page.locator(".board-card").first();
    await card.focus();
    await page.keyboard.press("Enter");

    const drawer = page.locator("#drawer");
    await expect(drawer).toBeInViewport();
  });

  test("drawer becomes visible after activating a card via keyboard (Space)", async ({ page }) => {
    const card = page.locator(".board-card").first();
    await card.focus();
    await page.keyboard.press("Space");

    const drawer = page.locator("#drawer");
    await expect(drawer).toBeInViewport();
  });
});

test.describe("focus trap", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/tests/robotsix_board/e2e/fixtures/board.html");
    await page.waitForSelector("#board");
    // Open the drawer via keyboard
    const card = page.locator(".board-card").first();
    await card.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#drawer")).toBeInViewport();
  });

  test("Tab cycles within drawer and wraps from last to first focusable", async ({ page }) => {
    const drawer = page.locator("#drawer");
    const closeBtn = drawer.locator(".drawer-close");

    // Focus should start on close button (set by openDrawer)
    await expect(closeBtn).toBeFocused();

    // Tab forward should stay within the drawer
    // With only the close button, Tab wraps to itself
    await page.keyboard.press("Tab");
    await expect(closeBtn).toBeFocused();
  });

  test("Shift+Tab wraps from first focusable to last within the drawer", async ({ page }) => {
    const drawer = page.locator("#drawer");
    const closeBtn = drawer.locator(".drawer-close");

    await expect(closeBtn).toBeFocused();

    // Shift+Tab should wrap to last focusable (same element when only one)
    await page.keyboard.press("Shift+Tab");
    await expect(closeBtn).toBeFocused();
  });
});

test.describe("Escape to close", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/tests/robotsix_board/e2e/fixtures/board.html");
    await page.waitForSelector("#board");
  });

  test("Escape closes the drawer and returns focus to the triggering card", async ({ page }) => {
    const card = page.locator(".board-card").first();
    await card.focus();
    await page.keyboard.press("Enter");

    const drawer = page.locator("#drawer");
    await expect(drawer).toBeInViewport();

    await page.keyboard.press("Escape");

    await expect(drawer).not.toBeInViewport();
    await expect(card).toBeFocused();
  });
});
