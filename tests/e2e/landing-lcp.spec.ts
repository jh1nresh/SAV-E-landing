import { expect, test } from "@playwright/test";
import { noHorizontalOverflow } from "./helpers";

test.describe("dedicated map attribution", () => {
  test("OSM attribution link is present with the licence href", async ({ context }) => {
    const zh = await context.newPage();
    await zh.goto("/metro");
    const link = zh.getByTestId("osm-attribution");
    await expect(link).toHaveText("Map data © OpenStreetMap contributors");
    await expect(link).toHaveAttribute("href", "https://www.openstreetmap.org/copyright");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
    await expect(link).toHaveCount(1);
    await zh.close();

    const en = await context.newPage();
    await en.goto("/metro?lang=en");
    await expect(en.getByTestId("osm-attribution")).toHaveAttribute(
      "href",
      "https://www.openstreetmap.org/copyright",
    );
    await expect(en.getByTestId("osm-attribution")).toHaveCount(1);
    await en.close();
  });

  for (const width of [375, 390]) {
    test(`OSM credit does not overflow at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/metro");
      await page.getByTestId("osm-attribution").scrollIntoViewIfNeeded();
      await expect(page.getByTestId("osm-attribution")).toBeVisible();
      await noHorizontalOverflow(page);
    });
  }
});
