import { expect, test } from "@playwright/test";
import { waitForMap } from "./helpers";

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`mapcard diagnostic at ${viewport.width}x${viewport.height}`, async ({ page, browserName }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto("/?reduce=1");
    await waitForMap(page);
    await page.locator("#vp").scrollIntoViewIfNeeded();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1500);
    expect(await page.evaluate(() => window.__savvyMap?.state().openId)).toBeNull();

    const emit = async (data: object, name: string) => {
      const json = JSON.stringify({ browserName, viewport, ...data });
      console.log(`MAPCARD-DIAG ${json}`);
      await testInfo.attach(name, { body: json, contentType: "application/json" });
    };
    const before = await page.evaluate(() => {
      const describe = (el: Element | null) => el ? {
        tag: el.tagName, id: el.id, classes: el.getAttribute("class"),
        closestTestId: el.closest("[data-testid]")?.getAttribute("data-testid") ?? null,
      } : null;
      const card = document.querySelector("#mapcard")!;
      const style = getComputedStyle(card);
      const parents = [];
      for (let el = card.parentElement; el; el = el.parentElement) {
        const computed = getComputedStyle(el);
        parents.push({ ...describe(el), pointerEvents: computed.pointerEvents, visibility: computed.visibility });
      }
      const hit = document.querySelector('[data-testid="metro-pin-arena"] .hit')!.getBoundingClientRect();
      const pinCentre = { x: hit.left + hit.width / 2, y: hit.top + hit.height / 2 };
      const label = [...document.querySelectorAll("#stdots text")].find(el => el.textContent?.trim() === "小巨蛋")!;
      const characters = [];
      const walker = document.createTreeWalker(label, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        let offset = 0;
        for (const char of node.textContent || "") {
          const range = document.createRange();
          range.setStart(node, offset);
          offset += char.length;
          range.setEnd(node, offset);
          characters.push({ char, centres: [...range.getClientRects()].map(rect => {
            const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
            return { x, y, elementFromPoint: describe(document.elementFromPoint(x, y)) };
          }) });
        }
      }
      return {
        mapcard: { pointerEvents: style.pointerEvents, visibility: style.visibility,
          display: style.display, opacity: style.opacity, boundingBox: card.getBoundingClientRect().toJSON(), parents },
        pinCentre: { ...pinCentre, elementFromPoint: describe(document.elementFromPoint(pinCentre.x, pinCentre.y)) },
        characters,
      };
    });
    await emit({ phase: "closed", ...before }, "closed-mapcard.json");
    await page.mouse.click(before.pinCentre.x, before.pinCentre.y);
    // Allow selection/visibility transitions to settle without asserting their outcome.
    await page.waitForTimeout(1500);
    const openId = await page.evaluate(() => window.__savvyMap?.state().openId ?? null);
    await emit({ phase: "after-click", openId, arenaSelected: openId === "arena",
      mapcardVisible: await page.locator("#mapcard").isVisible() }, "after-click.json");
  });
}
