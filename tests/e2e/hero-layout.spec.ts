import { expect, test } from "@playwright/test";
import { noHorizontalOverflow, waitForMap } from "./helpers";

const WIDTHS = [320, 360, 375, 390, 768, 1280, 1440];

test.describe("hero layout", () => {
  for (const width of WIDTHS) {
    test(`C-2 no horizontal overflow at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/metro");
      await waitForMap(page);
      await noHorizontalOverflow(page);
    });
  }

  test("G-1 EN toggle does not break the hero", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/metro");
    await waitForMap(page);
    await page.getByRole("button", { name: "EN" }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByText("Metro food map")).toBeVisible();
    await expect(page.locator("[data-testid=metro-map]")).toBeVisible();
    await expect(page.locator("#mapsvg")).toBeVisible();
    await noHorizontalOverflow(page);
  });

});
