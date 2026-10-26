import { expect, test } from "@playwright/test";
import { openStation } from "./helpers";

for (const mode of ["", "reduce=1"]) {
  test(`returning home during a station transition cancels selection (${mode || "animated"})`, async ({ page }) => {
    await page.goto(`/?${mode}`);
    await openStation(page, "arena");
    await page.evaluate(() => {
      window.__savvyMap!.select("dongmen");
      window.__savvyMap!.goHome();
    });
    // Outlast both the selection delay and the closing animation.
    await page.waitForTimeout(1500);
    await expect(page.locator("#card")).toBeHidden();
    expect(await page.evaluate(() => window.__savvyMap!.state().openId)).toBeNull();
    await expect(page.locator("#reset")).not.toHaveClass(/on/);
  });

  test(`immediate reset also cancels a deferred camera flight (${mode || "animated"})`, async ({ page }) => {
    await page.goto(`/?${mode}`);
    await page.waitForFunction(() => !!window.__savvyMap);
    await page.evaluate(() => {
      window.__savvyMap!.select("arena");
      window.__savvyMap!.goHome();
    });
    await page.waitForTimeout(1500);
    await expect(page.locator("#card")).toBeHidden();
    await expect(page.locator("#reset")).not.toHaveClass(/on/);
  });
}

test("future posts do not contribute NEW badges or weekly count", async ({ page }) => {
  await page.goto("/?clock=2026-10-20");
  await page.waitForFunction(() => !!window.__savvyMap);
  await expect(page.locator(".strip .newtag")).toHaveCount(0);
  await expect(page.locator("#stampA")).toBeEmpty();
  expect(await page.evaluate(() => window.__savvyMap!.state().weekCount)).toBe(0);
});

test("English page marks the intentionally Chinese live map language", async ({ page }) => {
  await page.goto("/?lang=en");
  await page.waitForFunction(() => !!window.__savvyMap);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByTestId("metro-map")).toHaveAttribute("lang", "zh-Hant");
});
