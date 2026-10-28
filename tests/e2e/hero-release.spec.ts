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

  for (const action of ["escape", "close-button"]) {
    test(`explicit ${action} cancels a pending station (${mode || "animated"})`, async ({ page }) => {
      await page.goto(`/?${mode}`);
      await openStation(page, "arena");
      await page.evaluate(action => {
        window.__savvyMap!.select("dongmen");
        if (action === "escape") window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
        else document.getElementById("cardX")!.click();
      }, action);
      await page.waitForTimeout(1500);
      expect(await page.evaluate(() => window.__savvyMap!.state().openId)).toBeNull();
      // Slow WebKit frames can extend the spring; the pending selection must
      // already be cancelled, then the original card must finish closing.
      // Close latency is frame-bound (slow WebKit CI); wait for it on its own budget.
      await page.waitForFunction(() => { const s = window.__savvyMap!.state(); return s.showing === null && !s.closing; }, null, { timeout: 45_000 });
      await expect(page.locator("#card")).toBeHidden();
    });
  }

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


test("Escape cancels selection in the reduced-motion gap after the old card closes", async ({ page }) => {
  await page.goto("/?reduce=1");
  await openStation(page, "arena");
  // Freeze before scheduling the switch: RPC latency must not consume the
  // 9ms gap between the 250ms close and the 260ms pending selection.
  await page.clock.install({ time: new Date("2026-10-27T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-27T00:00:01Z"));
  await page.evaluate(() => window.__savvyMap!.select("dongmen"));
  await page.clock.runFor(251);
  expect(await page.evaluate(() => window.__savvyMap!.state().showing)).toBeNull();
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })));
  await page.clock.runFor(30);
  expect(await page.evaluate(() => window.__savvyMap!.state().openId)).toBeNull();
  await expect(page.locator("#card")).toBeHidden();
});
