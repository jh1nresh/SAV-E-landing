import { expect, type Page } from "@playwright/test";
import type {} from "../../app/metro/map-runtime";

export async function waitForMap(page: Page) {
  await page.waitForFunction(() => Boolean(window.__savvyMap), null, { timeout: 20_000 });
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
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth, `scrollWidth ${scrollWidth} > innerWidth ${innerWidth}`).toBeLessThanOrEqual(innerWidth + 1);
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
