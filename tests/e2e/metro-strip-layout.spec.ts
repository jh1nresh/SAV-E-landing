import { expect, test } from "@playwright/test";
import { waitForMap } from "./helpers";
import { buildFoodStations } from "../../scripts/metro-content.mjs";

const STATION_COUNT = buildFoodStations(".").length;

function intersects(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

for (const width of [1280, 1440]) {
  test(`desktop station options stay tappable and clear the trigger at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await waitForMap(page);
    await page.evaluate(() => document.fonts.ready);
    const trigger = page.getByTestId("station-picker-trigger");
    await trigger.click();
    const options = page.getByRole("option");
    await expect(options).toHaveCount(STATION_COUNT);
    for (const option of await options.all()) {
      const box = await option.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    const triggerBox = (await trigger.boundingBox())!;
    const stampBox = (await page.locator("#stamp").boundingBox())!;
    expect(intersects(triggerBox, stampBox)).toBe(false);
  });
}
