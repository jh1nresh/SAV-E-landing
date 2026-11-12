import { expect, test, type Page } from "@playwright/test";
import {
  clickPin,
  dispatchMapPointerDrag,
  dragMap,
  emptyMapPoint,
  realTouchDrag,
  realTouchTapPin,
  waitForCardOpen,
  waitForMap,
  worldScreenPos,
} from "./helpers";

test.describe("hero map pan", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/taipei?reduce=1");
    await waitForMap(page);
    await page.locator("[data-testid=metro-vp]").scrollIntoViewIfNeeded();
  });

  test("mouse drag changes the world transform", async ({ page }) => {
    const before = await page.evaluate(() => window.__savvyMap!.state());
    await expect(page.locator("#vp")).toHaveCSS("cursor", "grab");
    // The wider home view starts at the left camera bound; drag toward available travel.
    await dragMap(page, -90, 0);
    const after = await page.evaluate(() => window.__savvyMap!.state());
    expect(after.worldTransform).not.toBe(before.worldTransform);
    expect(after.camX).toBeGreaterThan(before.camX);
    expect(after.camY).toBeCloseTo(before.camY, 1);
    expect(after.openId).toBeNull();
  });

  test("mouse drag pans only on the Y axis", async ({ page }) => {
    const before = await worldScreenPos(page);
    await dragMap(page, 0, -70);
    const after = await worldScreenPos(page);
    expect(before.top - after.top).toBeGreaterThan(60);
    expect(Math.abs(after.left - before.left)).toBeLessThan(2);
    expect(await page.evaluate(() => window.__savvyMap!.state().openId)).toBeNull();
  });

  test("mouse drag toward the Y camera edge is clamped", async ({ page }) => {
    await dragMap(page, 0, 1800);
    const before = await worldScreenPos(page);
    const state = await page.evaluate(() => window.__savvyMap!.state());
    const bound = -170 + state.viewH / (2 * state.camS);
    expect(state.camY).toBeCloseTo(bound, 5);
    const start = await emptyMapPoint(page);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    for (let dy = 10; dy <= 70; dy += 10) {
      await page.mouse.move(start.x, start.y + dy);
      const current = await page.evaluate(() => window.__savvyMap!.state());
      expect(current.camY).toBeGreaterThanOrEqual(bound);
      expect(Math.abs((current.camY - state.camY) * current.camS)).toBeLessThan(2);
    }
    await page.mouse.up();
    const after = await worldScreenPos(page);
    expect(Math.abs(after.top - before.top)).toBeLessThan(2);
    expect(Math.abs(after.left - before.left)).toBeLessThan(2);
    expect((await page.evaluate(() => window.__savvyMap!.state())).camY).toBeGreaterThanOrEqual(bound);
  });

  test("touch drag pans the camera", async ({ page }) => {
    const before = await page.evaluate(() => window.__savvyMap!.state());
    await dispatchMapPointerDrag(page, -80, 0, "touch");
    const after = await page.evaluate(() => window.__savvyMap!.state());
    expect(after.worldTransform).not.toBe(before.worldTransform);
    expect(after.camX).toBeGreaterThan(before.camX);
    expect(after.openId).toBeNull();
  });

  test("home: drag toward the left camera edge is clamped", async ({ page }) => {
    const before = await worldScreenPos(page);
    const state = await page.evaluate(() => window.__savvyMap!.state());
    const bound = -150 + state.viewW / (2 * state.camS);
    expect(state.camX).toBeCloseTo(bound, 5);
    const start = await emptyMapPoint(page);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    for (let dx = 10; dx <= 70; dx += 10) {
      await page.mouse.move(start.x + dx, start.y);
      const current = await page.evaluate(() => window.__savvyMap!.state());
      expect(current.camX).toBeGreaterThanOrEqual(bound);
      expect(Math.abs((current.camX - state.camX) * current.camS)).toBeLessThan(2);
    }
    await page.mouse.up();
    const after = await worldScreenPos(page);
    expect(Math.abs(after.left - before.left)).toBeLessThan(2);
    expect(Math.abs(after.top - before.top)).toBeLessThan(2);
    expect((await page.evaluate(() => window.__savvyMap!.state())).camX).toBeGreaterThanOrEqual(bound);
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

  test.describe("real pin-start touch", () => {
    test.use({ hasTouch: true });

    async function assertPinTouchPans(page: Page, pinId: string, home = false) {
      const before = await worldScreenPos(page);
      const box = (await page.getByTestId(`metro-pin-${pinId}`).locator('.hit').boundingBox())!;
      await realTouchDrag(page, { x: box.x + box.width / 2, y: box.y + box.height / 2 }, home ? -70 : 70, 0);
      await page.waitForTimeout(50);
      const after = await worldScreenPos(page);
      const dx = after.left - before.left;
      expect(home ? -dx : dx, `horizontal movement ${dx.toFixed(1)}px`).toBeGreaterThan(60);
      expect(Math.abs(after.top - before.top)).toBeLessThan(5);
      expect(await page.evaluate(() => window.__savvyMap!.state().openId)).toBeNull();
      await expect(page.locator("#card")).toBeHidden();
    }

    test("home at 1280: pin-start touch pans ~25.7px to the camera bound without selecting", async ({ page }, testInfo) => {
      const before = await worldScreenPos(page);
      const box = (await page.getByTestId("metro-pin-houshanpi").locator(".hit").boundingBox())!;
      await realTouchDrag(page, { x: box.x + box.width / 2, y: box.y + box.height / 2 }, -70, 0);
      await page.waitForTimeout(50);
      const after = await worldScreenPos(page);
      const distance = before.left - after.left;
      console.log(`${testInfo.project.name}: 1280 pin-start touch pan = ${distance.toFixed(3)}px`);
      expect(Math.abs(distance - 25.7)).toBeLessThanOrEqual(2);
      expect(Math.abs(after.top - before.top)).toBeLessThan(2);
      const state = await page.evaluate(() => window.__savvyMap!.state());
      const bound = -150 + 1000 - state.viewW / (2 * state.camS);
      expect(state.camX).toBeLessThanOrEqual(bound);
      expect(state.camX).toBeCloseTo(bound, 5);
      expect(state.openId).toBeNull();
      await expect(page.locator("#card")).toBeHidden();
    });

    test("home: touch drag from a pin pans ~70px and does not select", async ({ page }) => {
      // At 1280 the fixed world bounds leave only 25.7px of horizontal travel.
      // Use a mobile touch viewport with room for the full 70px gesture.
      await page.setViewportSize({ width: 390, height: 844 });
      await page.evaluate(() => window.__savvyMap!.applySize());
      await page.locator('#vp').scrollIntoViewIfNeeded();
      await assertPinTouchPans(page, "houshanpi", true);
      await page.evaluate(() => window.__savvyMap!.goHome());
      await page.waitForTimeout(50);
      await realTouchTapPin(page, "houshanpi");
      await waitForCardOpen(page);
      await expect(page.locator("#cardTitle")).toContainText("後山埤");
    });

    test("zoomed: touch drag from a pin pans ~70px and does not select", async ({ page }) => {
      await page.evaluate((id) => window.__savvyMap!.select(id), "dongmen");
      await waitForCardOpen(page);
      await page.evaluate(() => window.__savvyMap!.closeCard({ focus: false }));
      await expect(page.locator("#card")).toBeHidden();
      await expect(page.locator("#vp")).toHaveClass(/zoomed/);
      await assertPinTouchPans(page, "dongmen");
    });

    test("Enter on a pin still selects after a touch pan", async ({ page }) => {
      const start = await emptyMapPoint(page);
      await realTouchDrag(page, start, 70, 0);
      await expect(page.locator("#card")).toBeHidden();
      const pin = page.locator("[data-testid=metro-pin-houshanpi]");
      await pin.focus();
      await expect(pin).toBeFocused();
      await page.keyboard.press("Enter");
      await waitForCardOpen(page);
      await expect(page.locator("#cardTitle")).toContainText("後山埤");
      await page.keyboard.press("Escape");
      await expect(page.locator("#card")).toBeHidden();
      await pin.focus();
      await page.keyboard.press("Space");
      await waitForCardOpen(page);
    });
  });

  test("vertical touch swipe on the home map does not trap page scroll", async ({ page, browserName }) => {
    await page.setViewportSize({ width: 390, height: 700 });
    await page.goto("/taipei?reduce=1");
    await waitForMap(page);
    await page.locator("[data-testid=metro-vp]").scrollIntoViewIfNeeded();

    const before = await page.evaluate(() => window.__savvyMap!.state());
    await dispatchMapPointerDrag(page, 0, 80, "touch");
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
    await dispatchMapPointerDrag(page, 0, 60, "touch");
    const after = await page.evaluate(() => window.__savvyMap!.state());
    expect(after.camY).not.toBeCloseTo(before.camY, 1);
    expect(after.worldTransform).not.toBe(before.worldTransform);
  });

  test("reset returns home after a pan", async ({ page }) => {
    const home = await page.evaluate(() => {
      const s = window.__savvyMap!.state();
      return { x: s.camX, y: s.camY, t: s.worldTransform };
    });
    await dragMap(page, -100, 0);
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
    await dragMap(page, -70, 0);
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
