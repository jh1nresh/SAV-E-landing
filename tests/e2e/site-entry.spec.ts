import { expect, test } from "@playwright/test";
import { noHorizontalOverflow, waitForMap } from "./helpers";

for (const width of [320, 1280]) {
  test(`the focused map and its navigation fit at ${width}px`, async ({ page }) => {
    const height = 800;
    await page.setViewportSize({ width, height });
    await page.goto("/discover");
    await waitForMap(page);
    const map = page.getByTestId("metro-map");
    await expect(map).toBeVisible();
    await expect(page.locator("main h1:visible")).toHaveCount(1);
    await expect(page.locator("a.download-entry, .hero-stk, footer.site")).toHaveCount(0);
    await expect(page.locator("nav.top").getByRole("link", { name: "← 捷運美食" })).toHaveAttribute("href", "/metro#taipei");
    const frame = (await page.locator("#vp").boundingBox())!;
    expect(frame.width).toBeGreaterThan(width * 0.7);
    expect(frame.y + 200).toBeLessThan(height);
    const english = page.getByRole("button", { name: "EN", exact: true });
    await english.press("Enter");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Metro food map");
    await expect(map).toBeVisible();
    await noHorizontalOverflow(page);
  });
}

test("native city and guide links work without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  try {
    const page = await context.newPage();
    await page.goto("/discover");
    await expect(page.getByRole("img", { name: "台北捷運美食地圖" })).toBeVisible();
    await page.getByTestId("city-switch-shanghai").click();
    await expect(page).toHaveURL(/\/shanghai$/);
    await expect(page.getByRole("img", { name: "上海地鐵美食地圖" })).toBeVisible();
    await page.getByRole("link", { name: "← 捷運美食" }).click();
    await expect(page).toHaveURL(/\/metro#shanghai$/);
  } finally {
    await context.close();
  }
});
