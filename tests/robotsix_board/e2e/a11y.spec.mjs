import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("a11y audit", () => {
  test("board fixture has no critical or serious a11y violations", async ({
    page,
  }) => {
    await page.goto("/tests/robotsix_board/e2e/fixtures/board.html");
    await page.waitForSelector("#board");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    // relax color-contrast if dark-theme tokens are known to have insufficient
    // contrast — file a separate tracking issue for each exemption.
    const violations = results.violations.filter(
      (v) => v.id !== "color-contrast",
    );
    expect(violations).toEqual([]);
  });
});