import { expect, test } from "@playwright/test";
import { heroBadgeBox, noHorizontalOverflow, waitForMap } from "./helpers";

const WIDTHS = [360, 375, 390, 768, 1280, 1440];

test.describe("hero layout", () => {
  for (const width of WIDTHS) {
    test(`C-2 no horizontal overflow at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/");
      await waitForMap(page);
      await noHorizontalOverflow(page);
    });
  }

  test("C-1 App Store badge is in the first screen at 1280x800", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    const box = await heroBadgeBox(page);
    expect(box).toBeTruthy();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(800);
  });

  test("C-1 App Store badge is in the first screen at 390x844", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const box = await heroBadgeBox(page);
    expect(box).toBeTruthy();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(844);
  });

  test("C-3 measure App Store badge at 375x667", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await noHorizontalOverflow(page);
    const box = await heroBadgeBox(page);
    expect(box).toBeTruthy();
    const inFirstScreen = box!.y >= 0 && box!.y + box!.height <= 667;
    await testInfo.attach("se-badge.json", {
      body: JSON.stringify({ box, inFirstScreen, viewport: { width: 375, height: 667 } }, null, 2),
      contentType: "application/json",
    });
    expect(box!.width).toBeGreaterThan(20);
  });

  test("G-1 EN toggle does not break the hero", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await waitForMap(page);
    await page.getByRole("button", { name: "EN" }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByText("Save what you love")).toBeVisible();
    await expect(page.locator("[data-testid=metro-map]")).toBeVisible();
    await expect(page.locator("#mapsvg")).toBeVisible();
    await noHorizontalOverflow(page);
  });

  test("C-5 only five official stickers in the hero", async ({ page }) => {
    await page.goto("/");
    const srcs = await page.locator(".hero-stk img").evaluateAll((imgs) =>
      imgs.map((img) => (img as HTMLImageElement).getAttribute("src")),
    );
    expect(srcs).toEqual([
      "/assets/st-duck.png",
      "/assets/st-noodle.png",
      "/assets/st-coffee.png",
      "/assets/st-temple.png",
      "/assets/st-lantern.png",
    ]);
    await expect(page.locator('img[src*="elephant"]')).toHaveCount(0);
    await expect(page.locator("text=小象")).toHaveCount(0);
  });
});
