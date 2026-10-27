import { expect, test } from "@playwright/test";
import { dragMap, waitForMap } from "./helpers";

for (const width of [390, 1280]) {
  test(`zoom buttons, bounds and reset at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/?reduce=1');
    await waitForMap(page);
    const plus = page.getByRole('button', { name: '放大地圖', exact: true });
    const minus = page.getByRole('button', { name: '縮小地圖', exact: true });
    const s0 = await page.evaluate(() => window.__savvyMap!.state().s0);
    const controls = (await page.locator('.mapzoom').boundingBox())!;
    const stamp = (await page.locator('#stamp').boundingBox())!;
    expect(controls.x < stamp.x + stamp.width && controls.x + controls.width > stamp.x &&
      controls.y < stamp.y + stamp.height && controls.y + controls.height > stamp.y).toBe(false);
    await expect(minus).toBeDisabled();
    await plus.focus();
    await page.keyboard.press('Enter');
    expect(await page.evaluate(() => window.__savvyMap!.state().camS)).toBeGreaterThan(s0);
    await minus.click();
    expect(await page.evaluate(() => window.__savvyMap!.state().camS)).toBeCloseTo(s0);
    for (let i = 0; i < 8 && await plus.isEnabled(); i++) await plus.click();
    await expect(plus).toBeDisabled();
    expect(await page.evaluate(() => window.__savvyMap!.state().camS)).toBeCloseTo(s0 * 3);
    await page.getByRole('button', { name: '回到全圖' }).click();
    expect(await page.evaluate(() => window.__savvyMap!.state().camS)).toBeCloseTo(s0);
    await expect(minus).toBeDisabled();
    for (const button of [plus, minus]) {
      const box = await button.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  });
}

test('wheel zoom anchors the cursor and ignores card scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/?reduce=1');
  await waitForMap(page);
  await page.locator('#vp').scrollIntoViewIfNeeded();
  const box = (await page.locator('#vp').boundingBox())!;
  const before = await page.evaluate(() => window.__savvyMap!.state());
  const offset = { x: Math.round(box.x + box.width * .4) - box.x, y: Math.round(box.y + box.height * .55) - box.y };
  await page.mouse.move(box.x + offset.x, box.y + offset.y);
  await page.mouse.wheel(0, -240);
  await expect.poll(() => page.evaluate(() => window.__savvyMap!.state().camS)).toBeGreaterThan(before.camS);
  const after = await page.evaluate(() => window.__savvyMap!.state());
  expect(after.camX + (offset.x - box.width / 2) / after.camS).toBeCloseTo(before.camX + (offset.x - box.width / 2) / before.camS, 1);
  expect(after.camY + (offset.y - box.height / 2) / after.camS).toBeCloseTo(before.camY + (offset.y - box.height / 2) / before.camS, 1);
  await page.mouse.wheel(0, 240);
  await expect.poll(() => page.evaluate(() => window.__savvyMap!.state().camS)).toBeCloseTo(before.s0);
  await page.evaluate(() => window.__savvyMap!.select('arena'));
  await expect(page.locator('#card')).toBeVisible();
  const cardScale = await page.evaluate(() => window.__savvyMap!.state().camS);
  await page.locator('#cardTitle').hover();
  await page.mouse.wheel(0, 200);
  expect(await page.evaluate(() => window.__savvyMap!.state().camS)).toBeCloseTo(cardScale);
});

test.describe('two-finger zoom', () => {
  test.use({ hasTouch: true });
  for (const mode of ['', 'reduce=1']) {
    test(`pinch out and in keeps page scale and suppresses pin taps (${mode || 'animated'})`, async ({ page, browserName }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`/?${mode}`);
      await waitForMap(page);
      await page.locator('#vp').scrollIntoViewIfNeeded();
      const box = (await page.locator('#vp').boundingBox())!;
      const x = Math.round(box.x + box.width / 2), y = Math.round(box.y + box.height * .65);
      const before = await page.evaluate(() => ({ ...window.__savvyMap!.state(), scrollY, pageScale: visualViewport!.scale }));
      // Chromium uses native touch input. WebKit's API has no native touch-move;
      // its TouchEvent path is exercised separately, not claimed as device proof.
      const cdp = browserName === 'chromium' ? await page.context().newCDPSession(page) : null;
      const fire = async (type: 'touchStart' | 'touchMove' | 'touchEnd', distance: number, single = false) => {
        const points = type === 'touchEnd' ? [] : [{ x: x - distance / 2, y, id: 1 }, ...single ? [] : [{ x: x + distance / 2, y, id: 2 }]];
        if (cdp) await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
        else await page.evaluate(({ type, points }) => {
          const vp = document.getElementById('vp')!;
          const touches = points.map(p => ({ identifier: p.id, clientX: p.x, clientY: p.y, target: vp }));
          const e = new Event(type.toLowerCase(), { bubbles: true, cancelable: true });
          Object.defineProperty(e, 'touches', { value: touches });
          vp.dispatchEvent(e);
        }, { type, points });
      };
      try {
        await fire('touchStart', 80, true);
        await fire('touchStart', 80);
        for (let d = 90; d <= 160; d += 10) await fire('touchMove', d);
        await expect.poll(() => page.evaluate(() => window.__savvyMap!.state().camS)).toBeGreaterThan(before.camS * 1.8);
        for (let d = 150; d >= 80; d -= 10) await fire('touchMove', d);
        await fire('touchEnd', 0);
        await expect.poll(() => page.evaluate(() => window.__savvyMap!.state().camS)).toBeCloseTo(before.s0, 1);
        const after = await page.evaluate(() => ({ scrollY, pageScale: visualViewport!.scale, openId: window.__savvyMap!.state().openId }));
        expect(after.pageScale).toBe(before.pageScale);
        expect(after.scrollY).toBe(before.scrollY);
        expect(after.openId).toBeNull();
        await expect(page.locator('#card')).toBeHidden();
        await page.getByRole('button', { name: '放大地圖', exact: true }).click();
        expect(await page.evaluate(() => window.__savvyMap!.state().camS)).toBeGreaterThan(before.s0);
      } finally { await cdp?.detach(); }
    });
  }
});


test('ending both tracked fingers unlocks gestures while an outside touch remains', async ({ page }) => {
  await page.goto('/?reduce=1');
  await waitForMap(page);
  await page.locator('#vp').scrollIntoViewIfNeeded();
  await page.evaluate(() => {
    const vp = document.getElementById('vp')!;
    const box = vp.getBoundingClientRect();
    const a = { identifier: 1, target: vp, clientX: box.x + 80, clientY: box.y + 100 };
    const b = { identifier: 2, target: vp, clientX: box.x + 160, clientY: box.y + 100 };
    const outside = { identifier: 3, target: document.body, clientX: 4, clientY: 4 };
    const fire = (target: Element, type: string, touches: object[]) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'touches', { value: touches });
      target.dispatchEvent(event);
    };
    fire(vp, 'touchstart', [a, b]);
    fire(document.body, 'touchstart', [a, b, outside]);
    fire(vp, 'touchend', [b, outside]);
    fire(vp, 'touchend', [outside]);
    fire(document.body, 'touchend', []);
  });
  const before = await page.evaluate(() => window.__savvyMap!.state());
  await dragMap(page, 60, 10);
  expect((await page.evaluate(() => window.__savvyMap!.state())).camX).toBeLessThan(before.camX);
  const box = (await page.locator('#vp').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, -200);
  await expect.poll(() => page.evaluate(() => window.__savvyMap!.state().camS)).toBeGreaterThan(before.camS);
});
