import { expect, test, type Page } from "@playwright/test";
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

// Z2 (founder 2026-10-27 16:05): plain wheel scrolls the page; Ctrl/⌘+wheel zooms the map.
type Mod = 'Control' | 'Meta';
const mapState = (page: Page) => page.evaluate(() => ({ ...window.__savvyMap!.state(), scrollY, pageScale: visualViewport!.scale }));

async function hoverMap(page: Page, fx = .5, fy = .5) {
  await page.setViewportSize({ width: 1350, height: 940 });
  await page.goto('/?reduce=1');
  await waitForMap(page);
  // Park the map in the viewport with page left to scroll in both directions.
  await page.evaluate(() => { const r = document.getElementById('vp')!.getBoundingClientRect(); window.scrollTo(0, Math.max(0, scrollY + r.top - 200)); });
  const box = (await page.locator('#vp').boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(940);
  const offset = { x: Math.round(box.width * fx), y: Math.round(box.height * fy) };
  await page.mouse.move(box.x + offset.x, box.y + offset.y);
  return { box, offset };
}

test('Z2-1 plain wheel over the map at 1x scrolls the page and does not zoom', async ({ page }) => {
  await hoverMap(page);
  const before = await mapState(page);
  for (let i = 0; i < 10; i++) await page.mouse.wheel(0, 120);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before.scrollY + 100);
  const after = await mapState(page);
  expect(after.camS).toBe(before.camS);
  expect(after.camX).toBe(before.camX);
  expect(after.camY).toBe(before.camY);
  expect(after.pageScale).toBe(1);
  // Upward wheel scrolls back as well (not swallowed at either end of the zoom range).
  for (let i = 0; i < 10; i++) await page.mouse.wheel(0, -120);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(after.scrollY);
  expect((await mapState(page)).camS).toBe(before.camS);
});

test('Z2-1b plain wheel over the map still scrolls the page while zoomed in', async ({ page }) => {
  await hoverMap(page);
  await page.getByRole('button', { name: '放大地圖', exact: true }).click();
  await page.mouse.move(...(await (async () => { const b = (await page.locator('#vp').boundingBox())!; return [b.x + b.width / 2, b.y + b.height / 2] as [number, number]; })()));
  const before = await mapState(page);
  expect(before.camS).toBeGreaterThan(before.s0);
  for (let i = 0; i < 5; i++) await page.mouse.wheel(0, 120);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before.scrollY + 100);
  expect((await mapState(page)).camS).toBe(before.camS);
});

for (const mod of ['Control', 'Meta'] as Mod[]) {
  test(`Z2-2 ${mod}+wheel zooms the map around the cursor, not the page`, async ({ page }) => {
    const { offset, box } = await hoverMap(page, .4, .55);
    const before = await mapState(page);
    await page.keyboard.down(mod);
    try {
      await page.mouse.wheel(0, -240);
      await expect.poll(() => page.evaluate(() => window.__savvyMap!.state().camS)).toBeGreaterThan(before.camS);
      const after = await mapState(page);
      // World point under the cursor stays fixed (same measure as #21).
      expect(after.camX + (offset.x - box.width / 2) / after.camS).toBeCloseTo(before.camX + (offset.x - box.width / 2) / before.camS, 1);
      expect(after.camY + (offset.y - box.height / 2) / after.camS).toBeCloseTo(before.camY + (offset.y - box.height / 2) / before.camS, 1);
      expect(after.pageScale).toBe(1);
      expect(after.scrollY).toBe(before.scrollY);
      await page.mouse.wheel(0, 240);
      await expect.poll(() => page.evaluate(() => window.__savvyMap!.state().camS)).toBeCloseTo(before.s0);
      expect((await mapState(page)).scrollY).toBe(before.scrollY);
    } finally { await page.keyboard.up(mod); }
  });
}

test('Z2-2b wheel default is prevented only for Ctrl/⌘ (touchpad pinch = ctrl+wheel)', async ({ page }) => {
  await hoverMap(page);
  const result = await page.evaluate(() => {
    const vp = document.getElementById('vp')!;
    const send = (init: WheelEventInit) => {
      const e = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: -40, ...init });
      vp.dispatchEvent(e);
      return { prevented: e.defaultPrevented, camS: window.__savvyMap!.state().camS };
    };
    const plain = send({});
    const horizontal = send({ deltaX: 60, deltaY: 0 });
    const pinch = send({ ctrlKey: true });
    const cmd = send({ metaKey: true });
    return { plain, horizontal, pinch, cmd, s0: window.__savvyMap!.state().s0 };
  });
  expect(result.plain.prevented).toBe(false);
  expect(result.plain.camS).toBe(result.s0);
  expect(result.horizontal.prevented).toBe(false);
  expect(result.horizontal.camS).toBe(result.s0);
  expect(result.pinch.prevented).toBe(true);
  expect(result.pinch.camS).toBeGreaterThan(result.s0);
  expect(result.cmd.prevented).toBe(true);
});

test('Z2-4 wheel over the zoom buttons and card keeps its behavior and never zooms', async ({ page }) => {
  await hoverMap(page);
  const before = await mapState(page);
  const plus = (await page.getByRole('button', { name: '放大地圖', exact: true }).boundingBox())!;
  await page.mouse.move(plus.x + plus.width / 2, plus.y + plus.height / 2);
  for (let i = 0; i < 4; i++) await page.mouse.wheel(0, 120);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before.scrollY);
  expect((await mapState(page)).camS).toBe(before.camS);
  await page.mouse.wheel(60, 0);
  expect((await mapState(page)).camS).toBe(before.camS);
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
  await page.keyboard.down('Control');
  try {
    await page.mouse.wheel(0, -200);
    await expect.poll(() => page.evaluate(() => window.__savvyMap!.state().camS)).toBeGreaterThan(before.camS);
  } finally { await page.keyboard.up('Control'); }
});
