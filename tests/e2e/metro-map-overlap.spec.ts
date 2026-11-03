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
      // label 框碰圖釘白邊，DESIGN 已確認字完整
      // DESIGN r6 line 29:「Eng 的 allowlist：小巨蛋 label 和 390w 後山埤圖釘 … ✅ 接受 … 只有文字框和圖釘白邊碰在一起，沒有任何字被蓋到」
      // 1440 accepted by DESIGN in writing: /workspace/shared/design/2026-11-04-pr40-xiaojudan-1440-exception.md — scope: text box touches pin outline/white border only, all 3 characters intact; any covered character is a blocker.
      { width: 1440, a: "label:小巨蛋", b: "photo:houshanpi" },
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

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`every station owns its hit center at ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/?reduce=1');
    await waitForMap(page);
    await page.locator('#vp').scrollIntoViewIfNeeded();
    await page.evaluate(() => document.fonts.ready);
    const markers = page.locator('[data-testid^="metro-pin-"]');
    expect(await markers.count()).toBeGreaterThan(0);
    for (const marker of await markers.all()) {
      await marker.scrollIntoViewIfNeeded();
      const result = await marker.evaluate(el => {
        const hit = el.querySelector('.hit')!;
        const r = hit.getBoundingClientRect();
        const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return {
          expected: el.getAttribute('data-testid'),
          actual: top?.closest('[data-testid^="metro-pin-"]')?.getAttribute('data-testid') ?? null,
          covering: {
            tag: top?.tagName,
            classes: top?.getAttribute('class'),
            testId: top?.getAttribute('data-testid'),
            closestTestId: top?.closest('[data-testid]')?.getAttribute('data-testid'),
          },
        };
      });
      expect(result.actual, `${result.expected} hit center covered by ${JSON.stringify(result.covering)}`).toBe(result.expected);
    }
  });
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`zhongshan upper hit edge selects its own station at ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/?reduce=1');
    await waitForMap(page);
    const marker = page.getByTestId('metro-pin-zhongshan');
    await marker.scrollIntoViewIfNeeded();
    // WebKit rounds native mouse coordinates to integers. The old fractional
    // exposed-point scan could land on 雙連 after that rounding.
    const target = await marker.locator('.hit').evaluate(el => {
      const r = el.getBoundingClientRect();
      const x = Math.floor(r.x + r.width / 2 - 3), y = Math.floor(r.y + 4);
      const top = document.elementFromPoint(x, y);
      return { x, y, owner: top?.closest('[data-testid^="metro-pin-"]')?.getAttribute('data-testid'),
        covering: top?.outerHTML };
    });
    expect(target.owner, `中山 upper hit edge covered by ${target.covering}`).toBe('metro-pin-zhongshan');
    const hit = await page.getByTestId('metro-pin-shuanglian').locator('.hit').boundingBox();
    expect(hit!.width).toBeGreaterThanOrEqual(44);
    expect(hit!.height).toBeGreaterThanOrEqual(44);
    await page.mouse.click(target.x, target.y);
    await expect(page.locator('#card')).toBeVisible();
    await expect(page.locator('#cardTitle')).toContainText('中山');
  });
}
