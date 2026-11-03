import { expect, test } from "@playwright/test";
import { waitForMap } from "./helpers";

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`station labels do not overlap at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/?reduce=1");
    await waitForMap(page);
    await page.locator("#vp").scrollIntoViewIfNeeded();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1500);
    // accepted by DESIGN 2026-11-04
    const acceptedPairs = [
      { width: 1440, a: "label:雙連", b: "photo:shuanglian" },
      { width: 390, a: "label:雙連", b: "photo:shuanglian" },
      { width: 390, a: "label:小巨蛋", b: "photo:houshanpi" },
    ];
    const result = await page.evaluate(({ width, acceptedPairs }) => {
      const collect = (selector: string) => [...document.querySelectorAll(selector)].map(el => ({
        name: el.textContent?.trim() || el.closest<HTMLElement>(".pin")?.dataset.id || selector,
        key: el.matches("#stdots text") ? `label:${el.textContent?.trim()}` :
          el.matches(".pin .ph") ? `photo:${el.closest<HTMLElement>(".pin")?.dataset.id}` : selector,
        rect: el.getBoundingClientRect().toJSON() as { left: number; right: number; top: number; bottom: number; width: number; height: number },
      })).filter(item => item.rect.width > 0 && item.rect.height > 0);
      const accepted = (a: string, b: string) => acceptedPairs.some(pair => pair.width === width &&
        ((pair.a === a && pair.b === b) || (pair.a === b && pair.b === a)));
      const labels = collect("#stdots text");
      const legends = collect("#world svg text").filter(item => ["淡水信義線", "板南線", "松山新店線", "中和新蘆線（虛線）"].includes(item.name));
      const obstacles = [...collect(".pin .ph, .cart, #stampB"), ...legends];
      const vp = document.querySelector("#vp")!.getBoundingClientRect();
      const offenders: string[] = [];
      for (const [i, label] of labels.entries()) {
        const a = label.rect;
        if (a.left < vp.left || a.right > vp.right || a.top < vp.top || a.bottom > vp.bottom) offenders.push(`${label.name} outside #vp: ${JSON.stringify(a)}`);
        for (const other of [...labels.slice(i + 1), ...obstacles]) {
          const b = other.rect;
          if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
              Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) {
            if (accepted(label.key, other.key)) continue;
            offenders.push(`${label.key} intersects ${other.key} by ${Math.min(a.right, b.right) - Math.max(a.left, b.left)}px horizontally and ${Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)}px vertically: ${JSON.stringify(a)} / ${JSON.stringify(b)}`);
          }
        }
      }
      const caption = collect(".map-live .cart")[0];
      const bubble = collect("#hint:not(.gone)")[0];
      if (caption && bubble) {
        const gap = bubble.rect.left - caption.rect.right;
        if (gap < 16) offenders.push(`caption ↔ bubble horizontal gap ${gap}px; requires 16px (short by ${16 - gap}px)`);
      }
      return { count: labels.length, offenders };
    }, { width: viewport.width, acceptedPairs });
    expect(result.count).toBe(14);
    expect(result.offenders, result.offenders.join("\n")).toEqual([]);
  });
}
