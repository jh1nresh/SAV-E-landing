import { expect, test } from "@playwright/test";
import {
  clickPin,
  dispatchMapPointerDrag,
  dispatchPinTouchDrag,
  dragMap,
  emptyMapPoint,
  waitForCardOpen,
  waitForMap,
} from "./helpers";

test.describe("hero map pan", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/?reduce=1");
    await waitForMap(page);
    await page.locator("[data-testid=metro-vp]").scrollIntoViewIfNeeded();
  });

  test("mouse drag changes the world transform", async ({ page }) => {
    const before = await page.evaluate(() => window.__savvyMap!.state());
    await expect(page.locator("#vp")).toHaveCSS("cursor", "grab");
    await dragMap(page, 90, 40);
    const after = await page.evaluate(() => window.__savvyMap!.state());
    expect(after.worldTransform).not.toBe(before.worldTransform);
    expect(after.camX).toBeLessThan(before.camX);
    expect(after.camY).toBeLessThan(before.camY);
    expect(after.openId).toBeNull();
  });

  test("touch drag pans the camera", async ({ page }) => {
    const before = await page.evaluate(() => window.__savvyMap!.state());
    await dispatchMapPointerDrag(page, 80, 10, "touch");
    const after = await page.evaluate(() => window.__savvyMap!.state());
    expect(after.worldTransform).not.toBe(before.worldTransform);
    expect(after.camX).toBeLessThan(before.camX);
    expect(after.openId).toBeNull();
  });

  test("a drag on a pin does not select the station", async ({ page }) => {
    const pin = page.locator("[data-testid=metro-pin-houshanpi] .hit");
    const box = await pin.boundingBox();
    expect(box).toBeTruthy();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();
    await page.mouse.move(box!.x + box!.width / 2 + 48, box!.y + box!.height / 2, { steps: 10 });
    await page.mouse.up();
    await expect(page.locator("#card")).toBeHidden();
    expect(await page.evaluate(() => window.__savvyMap!.state().openId)).toBeNull();
  });

  test("a tap still selects a station", async ({ page }) => {
    await clickPin(page, "houshanpi");
    await waitForCardOpen(page);
    await expect(page.locator("#cardTitle")).toContainText("後山埤");
  });

  test("touch drag starting on a pin pans and a tap still selects", async ({ page }) => {
    const before = await page.evaluate(() => {
      const world = document.getElementById("world")!.getBoundingClientRect();
      const s = window.__savvyMap!.state();
      return { left: world.left, top: world.top, camX: s.camX, camY: s.camY, openId: s.openId };
    });
    await dispatchPinTouchDrag(page, "houshanpi", 80, 8);
    const after = await page.evaluate(() => {
      const world = document.getElementById("world")!.getBoundingClientRect();
      const s = window.__savvyMap!.state();
      return { left: world.left, top: world.top, camX: s.camX, camY: s.camY, openId: s.openId };
    });
    expect(Math.hypot(after.left - before.left, after.top - before.top)).toBeGreaterThan(60);
    expect(after.camX).not.toBeCloseTo(before.camX, 1);
    expect(after.openId).toBeNull();
    await expect(page.locator("#card")).toBeHidden();

    await page.evaluate(() => window.__savvyMap!.goHome());
    await expect.poll(async () => {
      const s = await page.evaluate(() => window.__savvyMap!.state());
      return Math.hypot(s.camX - before.camX, s.camY - before.camY);
    }).toBeLessThan(2);
    await clickPin(page, "houshanpi");
    await waitForCardOpen(page);
    await expect(page.locator("#cardTitle")).toContainText("後山埤");
  });

  test("vertical touch swipe on the home map does not trap page scroll", async ({ page, browserName }) => {
    await page.setViewportSize({ width: 390, height: 700 });
    await page.goto("/?reduce=1");
    await waitForMap(page);
    await page.locator("[data-testid=metro-vp]").scrollIntoViewIfNeeded();

    const before = await page.evaluate(() => window.__savvyMap!.state());
    await dispatchMapPointerDrag(page, 4, 80, "touch");
    const after = await page.evaluate(() => window.__savvyMap!.state());
    expect(after.camX).toBeCloseTo(before.camX, 1);
    expect(after.camY).toBeCloseTo(before.camY, 1);
    expect(after.worldTransform).toBe(before.worldTransform);

    const metrics = await page.evaluate(() => ({
      touchAction: getComputedStyle(document.getElementById("vp")!).touchAction,
      scrollHeight: document.documentElement.scrollHeight,
      innerHeight: window.innerHeight,
      overflowY: getComputedStyle(document.documentElement).overflowY,
    }));
    expect(metrics.touchAction).toBe("pan-y");
    expect(metrics.overflowY).not.toBe("hidden");
    expect(metrics.scrollHeight).toBeGreaterThan(metrics.innerHeight + 80);

    if (browserName === "chromium") {
      await page.evaluate(() => window.scrollTo(0, 0));
      const start = await emptyMapPoint(page);
      const client = await page.context().newCDPSession(page);
      await client.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: start.x, y: start.y }],
      });
      for (let i = 1; i <= 10; i++) {
        await client.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x: start.x, y: start.y - i * 16 }],
        });
      }
      await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    }
  });

  test("zoomed touch can pan vertically after a station is framed", async ({ page }) => {
    await page.evaluate((id) => window.__savvyMap!.select(id), "dongmen");
    await waitForCardOpen(page);
    await page.evaluate(() => window.__savvyMap!.closeCard({ focus: false }));
    await expect(page.locator("#card")).toBeHidden();
    await expect(page.locator("#vp")).toHaveClass(/zoomed/);
    expect(await page.locator("#vp").evaluate((el) => getComputedStyle(el).touchAction)).toBe("none");

    const before = await page.evaluate(() => window.__savvyMap!.state());
    await dispatchMapPointerDrag(page, 8, 60, "touch");
    const after = await page.evaluate(() => window.__savvyMap!.state());
    expect(after.camY).not.toBeCloseTo(before.camY, 1);
    expect(after.worldTransform).not.toBe(before.worldTransform);
  });

  test("reset returns home after a pan", async ({ page }) => {
    const home = await page.evaluate(() => {
      const s = window.__savvyMap!.state();
      return { x: s.camX, y: s.camY, t: s.worldTransform };
    });
    await dragMap(page, 100, 30);
    await expect(page.locator("[data-testid=metro-reset]")).toHaveClass(/on/);
    const moved = await page.evaluate(() => window.__savvyMap!.state().worldTransform);
    expect(moved).not.toBe(home.t);
    await page.locator("[data-testid=metro-reset]").click();
    await expect.poll(async () => {
      const s = await page.evaluate(() => window.__savvyMap!.state());
      return Math.hypot(s.camX - home.x, s.camY - home.y);
    }).toBeLessThan(2);
    await expect(page.locator("[data-testid=metro-reset]")).not.toHaveClass(/on/);
    await expect(page.locator("#card")).toBeHidden();
  });

  test("selecting a station after a pan still flies the camera", async ({ page }) => {
    await dragMap(page, 70, 20);
    await clickPin(page, "arena");
    await waitForCardOpen(page);
    await expect(page.locator("#cardTitle")).toContainText("小巨蛋");
    const st = await page.evaluate(() => window.__savvyMap!.state());
    expect(st.openId).toBe("arena");
    expect(st.camS).toBeGreaterThan(st.s0 * 1.05);
  });

  test("a huge drag stays clamped in view", async ({ page }) => {
    await dragMap(page, 2400, 1800);
    const st = await page.evaluate(() => {
      const s = window.__savvyMap!.state();
      const world = document.getElementById("world")!.getBoundingClientRect();
      const vp = document.getElementById("vp")!.getBoundingClientRect();
      const overlap =
        Math.min(world.right, vp.right) > Math.max(world.left, vp.left) &&
        Math.min(world.bottom, vp.bottom) > Math.max(world.top, vp.top);
      return { camX: s.camX, camY: s.camY, transform: s.worldTransform, overlap };
    });
    expect(Number.isFinite(st.camX)).toBe(true);
    expect(Number.isFinite(st.camY)).toBe(true);
    expect(st.transform).not.toContain("NaN");
    expect(st.overlap).toBe(true);
  });
});
