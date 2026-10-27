import { expect, type Page } from "@playwright/test";
import type {} from "../../app/metro/map-runtime";

export async function waitForMap(page: Page) {
  const slot = page.locator("[data-testid=metro-map-slot], [data-testid=metro-map]");
  await slot.first().waitFor({ state: "attached", timeout: 20_000 });
  await page.waitForLoadState("networkidle").catch(() => undefined);

  const nudge = async () => {
    await page.evaluate(() => window.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })));
    await slot.first().click({ force: true }).catch(() => undefined);
  };

  if (await page.evaluate(() => Boolean(window.__savvyMap))) return;
  await nudge();
  try {
    await page.waitForFunction(() => Boolean(window.__savvyMap), null, { timeout: 8_000 });
    return;
  } catch {
    await nudge();
  }
  await page.waitForFunction(() => Boolean(window.__savvyMap), null, { timeout: 30_000 });
}

export async function waitForCardOpen(page: Page) {
  await expect(page.locator("#card")).toBeVisible();
  await page.waitForFunction(() => {
    const card = document.getElementById("card");
    if (!card || card.hasAttribute("hidden")) return false;
    const tr = getComputedStyle(card).transform;
    if (!tr || tr === "none") return true;
    const m = new DOMMatrixReadOnly(tr);
    return Math.abs(m.a - 1) < 0.08 && Math.abs(m.d - 1) < 0.08;
  });
}

export async function openStation(page: Page, id: string) {
  await waitForMap(page);
  await page.evaluate((stationId) => window.__savvyMap?.select(stationId), id);
  await waitForCardOpen(page);
}

export async function clickPin(page: Page, id: string) {
  await page.locator(`[data-testid=metro-pin-${id}] .hit`).click();
}

export async function noHorizontalOverflow(page: Page) {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    htmlOx: getComputedStyle(document.documentElement).overflowX,
    bodyOx: getComputedStyle(document.body).overflowX,
  }));
  expect(metrics.htmlOx, "html overflow-x must not mask overflow").not.toBe("hidden");
  expect(metrics.bodyOx, "body overflow-x must not mask overflow").not.toBe("hidden");
  expect(
    metrics.scrollWidth,
    `scrollWidth ${metrics.scrollWidth} > innerWidth ${metrics.innerWidth}`,
  ).toBeLessThanOrEqual(metrics.innerWidth + 1);
}

export async function heroBadgeBox(page: Page) {
  return page.locator("[data-testid=hero-appstore] .badge").first().boundingBox();
}

export async function dispatchSwipe(page: Page, dy: number) {
  const box = await page.locator("#card").boundingBox();
  if (!box) throw new Error("card not visible");
  const x = box.x + box.width / 2;
  const y = box.y + 28;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + dy, { steps: 10 });
  await page.mouse.up();
}

export async function emptyMapPoint(page: Page) {
  return page.evaluate(() => {
    const vp = document.getElementById("vp")!.getBoundingClientRect();
    const pins = [...document.querySelectorAll(".pin .hit, .reset, .card, .x")].map((el) =>
      el.getBoundingClientRect(),
    );
    const hits = (x: number, y: number) =>
      pins.some((p) => x >= p.left && x <= p.right && y >= p.top && y <= p.bottom);
    const candidates = [
      { x: vp.left + vp.width * 0.82, y: vp.top + 32 },
      { x: vp.left + 30, y: vp.top + 32 },
      { x: vp.left + vp.width * 0.5, y: vp.top + vp.height * 0.9 },
      { x: vp.left + vp.width * 0.15, y: vp.top + vp.height * 0.55 },
    ];
    return candidates.find((c) => !hits(c.x, c.y)) ?? candidates[0];
  });
}

export async function dragMap(page: Page, dx: number, dy: number) {
  const start = await emptyMapPoint(page);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + dx, start.y + dy, { steps: 12 });
  await page.mouse.up();
}

export async function pinHitPoint(page: Page, id: string) {
  const box = await page.locator(`[data-testid=metro-pin-${id}] .hit`).boundingBox();
  if (!box) throw new Error(`pin hit missing: ${id}`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

export async function worldScreenPos(page: Page) {
  return page.evaluate(() => {
    const r = document.getElementById("world")!.getBoundingClientRect();
    return { left: r.left, top: r.top };
  });
}

async function cdpTouchDrag(page: Page, start: { x: number; y: number }, dx: number, dy: number) {
  const steps = 14;
  const client = await page.context().newCDPSession(page);
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: start.x, y: start.y }],
  });
  for (let i = 1; i <= steps; i++) {
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: start.x + (dx * i) / steps, y: start.y + (dy * i) / steps }],
    });
  }
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await client.detach().catch(() => undefined);
}

/**
 * Real touch drag starting at `start`.
 * Chromium: CDP Input.dispatchTouchEvent (QA's reproduction).
 * WebKit: hasTouch context + Playwright touchscreen tap is start-only, so we
 * drive the contact with mouse after a real touch-enabled context and inject
 * the pin's bubbling lostpointercapture (implicit-capture release).
 */
export async function realTouchDrag(
  page: Page,
  start: { x: number; y: number },
  dx: number,
  dy: number,
) {
  try {
    await cdpTouchDrag(page, start, dx, dy);
    return;
  } catch {
    /* WebKit has no CDP */
  }

  const steps = 14;
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + dx / steps, start.y + dy / steps);
  await page.evaluate(
    ({ x, y }) => {
      const el = document.elementFromPoint(x, y) ?? document.getElementById("vp");
      el?.dispatchEvent(
        new PointerEvent("lostpointercapture", {
          bubbles: true,
          cancelable: true,
          composed: true,
          pointerId: 1,
          pointerType: "touch",
          isPrimary: true,
          clientX: x,
          clientY: y,
        }),
      );
    },
    { x: start.x + dx / steps, y: start.y + dy / steps },
  );
  await page.mouse.move(start.x + dx, start.y + dy, { steps });
  await page.mouse.up();
}

export async function realTouchDragFromPin(page: Page, id: string, distance = 70) {
  const start = await pinHitPoint(page, id);
  const vp = await page.locator("#vp").boundingBox();
  if (!vp) throw new Error("vp missing");
  const dx = start.x > vp.x + vp.width / 2 ? -distance : distance;
  const dy = 6 * Math.sign(dx);
  await realTouchDrag(page, start, dx, dy);
}

export async function realTouchTap(page: Page, start: { x: number; y: number }) {
  try {
    const client = await page.context().newCDPSession(page);
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: start.x, y: start.y }],
    });
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await client.detach().catch(() => undefined);
    return;
  } catch {
    await page.touchscreen.tap(start.x, start.y);
  }
}

export async function realTouchTapPin(page: Page, id: string) {
  await realTouchTap(page, await pinHitPoint(page, id));
}

export async function dispatchMapPointerDrag(
  page: Page,
  dx: number,
  dy: number,
  pointerType: "mouse" | "touch" = "touch",
) {
  const start = await emptyMapPoint(page);
  await page.evaluate(
    ({ start, dx, dy, pointerType }) => {
      const vp = document.getElementById("vp")!;
      const fire = (type: string, x: number, y: number) => {
        vp.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            composed: true,
            pointerId: 1,
            pointerType,
            isPrimary: true,
            button: 0,
            buttons: type === "pointerup" ? 0 : 1,
            clientX: x,
            clientY: y,
          }),
        );
      };
      fire("pointerdown", start.x, start.y);
      const steps = 8;
      for (let i = 1; i <= steps; i++) {
        fire("pointermove", start.x + (dx * i) / steps, start.y + (dy * i) / steps);
      }
      fire("pointerup", start.x + dx, start.y + dy);
    },
    { start, dx, dy, pointerType },
  );
}

export async function dispatchTouchSwipe(page: Page, dy: number) {
  const box = await page.locator("#card").boundingBox();
  if (!box) throw new Error("card not visible");
  const x = box.x + box.width / 2;
  const y = box.y + 28;
  await page.evaluate(
    async ({ x, y, dy }) => {
      const card = document.getElementById("card");
      if (!card) throw new Error("card missing");
      const fire = (type: string, clientY: number, ended = false) => {
        if (typeof Touch === "function") {
          const touch = new Touch({
            identifier: 1,
            target: card,
            clientX: x,
            clientY,
            pageX: x,
            pageY: clientY,
            radiusX: 2.5,
            radiusY: 2.5,
            rotationAngle: 0,
            force: 1,
          });
          card.dispatchEvent(
            new TouchEvent(type, {
              bubbles: true,
              cancelable: true,
              touches: ended ? [] : [touch],
              targetTouches: ended ? [] : [touch],
              changedTouches: [touch],
            }),
          );
          return;
        }
        card.dispatchEvent(
          new MouseEvent(type === "touchstart" ? "mousedown" : type === "touchend" ? "mouseup" : "mousemove", {
            bubbles: true,
            cancelable: true,
            clientX: x,
            clientY,
          }),
        );
      };
      try {
        fire("touchstart", y);
        fire("touchmove", y + dy / 2);
        fire("touchmove", y + dy);
        fire("touchend", y + dy, true);
      } catch {
        /* WebKit may reject Touch(); mouse path covers the same thresholds */
      }
    },
    { x, y, dy },
  );
}
