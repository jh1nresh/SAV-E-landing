import { expect, test } from "@playwright/test";
import { waitForMap, openStation } from "./helpers";

for (const width of [390, 1280]) {
  test(`map animation reuses geometry and keeps detail navigation at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await waitForMap(page);
    await page.evaluate(() => document.fonts.ready);
    const result = await page.evaluate(async () => {
      let boxes = 0;
      const original = SVGGraphicsElement.prototype.getBBox;
      SVGGraphicsElement.prototype.getBBox = function (...args) { boxes++; return original.apply(this, args); };
      try {
        window.__savvyMap!.select("arena");
        await new Promise(resolve => setTimeout(resolve, 350));
        const body = document.getElementById("cbody")!;
        return { boxes, opacity: Number(getComputedStyle(body).opacity) };
      } finally { SVGGraphicsElement.prototype.getBBox = original; }
    });
    expect(result.boxes, "a flight must not remeasure every SVG label on every frame").toBe(0);
    expect(result.opacity).toBeGreaterThanOrEqual(.95);
    const link = page.getByTestId("metro-food-link-arena");
    await expect(link).toHaveAttribute("href", "/metro/xiaojudan");
    await expect(link).toHaveAccessibleName("看小巨蛋站完整美食清單");
    await link.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/metro\/xiaojudan$/);
    await expect(page.locator("h1")).toHaveText("小巨蛋");
  });
}

test("cached label measurements refresh after resize and font loading", async ({ page }) => {
  await page.goto("/?reduce=1");
  await waitForMap(page);
  await page.evaluate(() => document.fonts.ready);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "放大地圖", exact: true }).click();
  const before = await page.evaluate(() => window.__savvyMap!.state());
  await page.evaluate(() => document.fonts.dispatchEvent(new Event("loadingdone")));
  const after = await page.evaluate(() => window.__savvyMap!.state());
  expect([after.camX, after.camY, after.camS]).toEqual([before.camX, before.camY, before.camS]);
  await openStation(page, "dongmen");
  await page.evaluate(() => document.fonts.dispatchEvent(new Event("loadingdone")));
  await expect(page.getByTestId("metro-card")).toBeVisible();
  await expect(page.getByTestId("metro-food-link-dongmen")).toHaveAttribute("href", "/metro/dongmen");
  const invalid = await page.locator("#stdots text").evaluateAll(els => els.some(el =>
    !Number.isFinite(Number(el.getAttribute("x"))) || !Number.isFinite(Number(el.getAttribute("y")))));
  expect(invalid).toBe(false);
});


test("slow frame work does not stretch the popup clock", async ({ page }) => {
  await page.goto("/");
  await waitForMap(page);
  await page.evaluate(() => document.fonts.ready);
  const result = await page.evaluate(async () => {
    const label = document.querySelector<SVGGraphicsElement>("#stdots text")!;
    const original = label.setAttribute;
    label.setAttribute = function (name, value) {
      if (name === "x") {
        const until = performance.now() + 70;
        while (performance.now() < until) { /* Simulate an expensive frame on a slower device. */ }
      }
      original.call(this, name, value);
    };
    const start = performance.now();
    try {
      window.__savvyMap!.select("arena");
      await new Promise<void>(resolve => {
        const check = () => {
          const visible = Number(document.getElementById("cbody")!.style.opacity) >= .95;
          if (visible || performance.now() - start > 1500) resolve();
          else requestAnimationFrame(check);
        };
        requestAnimationFrame(check);
      });
      return { elapsed: performance.now() - start, opacity: Number(document.getElementById("cbody")!.style.opacity) };
    } finally { label.setAttribute = original; }
  });
  expect(result.opacity).toBeGreaterThanOrEqual(.95);
  expect(result.elapsed).toBeLessThan(700);
});
