import { expect, test } from "@playwright/test";
import { waitForMap } from "./helpers";
import { buildFoodStations } from '../../scripts/metro-content.mjs';

const STATION_COUNT = buildFoodStations('.').length;

const visibleArtworkHitTesting = `
  #stdots text, #stdots text *, .pin .ph, .pin .ph *,
  .pin.new .gr, .pin.sel .gr, .pin .tl, .pin .nwd, .pin .lab, .pin .lab * {
    pointer-events: auto !important;
  }
  #vp, .pin .hit { pointer-events: none !important; }
`;

// Shared by the allowlist assertions and the deliberately occluded negative test.
function checkLabelCharacters({ width, height, names, movePhoto = false }: { width: number; height: number; names: string[]; movePhoto?: boolean }) {
  const offenders: string[] = [];
  const describe = (el: Element | null) => el ? JSON.stringify({
    tag: el.tagName, id: el.id, classes: el.getAttribute("class"),
    testId: el.getAttribute("data-testid"),
    marker: el.closest(".pin")?.getAttribute("data-testid") ?? null,
  }) : "null";
  const checkLabel = (el: Element) => {
    // QA method (a): divide the label content box evenly, identically in both engines.
    const box = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    const px = (value: string) => parseFloat(value) || 0;
    const left = box.left + px(style.paddingLeft) + px(style.borderLeftWidth);
    const right = box.right - px(style.paddingRight) - px(style.borderRightWidth);
    const top = box.top + px(style.paddingTop) + px(style.borderTopWidth);
    const bottom = box.bottom - px(style.paddingBottom) - px(style.borderBottomWidth);
    const characters = [...(el.textContent?.trim() || "")];
    if (!characters.length || right <= left || bottom <= top) throw new Error("Empty label content box");
    const cellWidth = (right - left) / characters.length;
    const cells = characters.map((char, index) => {
      const cellLeft = left + index * cellWidth;
      return { char, points: [
        { name: "centre", x: cellLeft + cellWidth / 2, y: (top + bottom) / 2 },
        { name: "top-left", x: cellLeft + 1, y: top + 1 },
        { name: "top-right", x: cellLeft + cellWidth - 1, y: top + 1 },
        { name: "bottom-left", x: cellLeft + 1, y: bottom - 1 },
        { name: "bottom-right", x: cellLeft + cellWidth - 1, y: bottom - 1 },
      ] };
    });
    if (movePhoto) {
      const pin = document.querySelector<HTMLElement>('[data-testid="metro-pin-houshanpi"]')!;
      const photo = pin.querySelector(".ph")!.getBoundingClientRect();
      const target = cells[Math.floor(cells.length / 2)].points[0];
      // Pin-layer positions are in viewport pixels; target the same cells checked below.
      pin.style.left = `${(parseFloat(pin.style.left) || 0) + target.x - photo.left - photo.width / 2}px`;
      pin.style.top = `${(parseFloat(pin.style.top) || 0) + target.y - photo.top - photo.height / 2}px`;
    }
    for (const { char, points } of cells) {
      const context = `label:${el.textContent?.trim()} char:${JSON.stringify(char)} viewport:${width}x${height}`;
      for (const point of points) {
        if (point.x < box.left || point.x > box.right || point.y < box.top || point.y > box.bottom) {
          throw new Error(`${context} point:${point.name} lies outside label box`);
        }
        const top = document.elementFromPoint(point.x, point.y);
        // DESIGN ruling /workspace/shared/design/2026-11-04-pr40-shuanglian-corner-ruling.md:
        // ONLY corner points of 「連」 in 雙連 may touch 雙連's own pin/photo. Centre, any
        // other covering element, and any 「雙」 point remain failures.
        const isCorner = point.name !== "centre";
        const ownShuanglianPin = !!top?.closest('[data-testid="metro-pin-shuanglian"]');
        if (el.textContent?.trim() === "雙連" && char === "連" && isCorner && ownShuanglianPin) continue;
        if (!top || !el.contains(top)) offenders.push(`${context} point:${point.name} (${point.x}, ${point.y}) covering:${describe(top)}`);
      }
    }
  };

  for (const name of names) {
    const el = [...document.querySelectorAll("#stdots text")].find(el => el.textContent?.trim() === name);
    if (!el) throw new Error(`Missing station label: ${name}`);
    checkLabel(el);
  }
  return offenders;
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`station labels do not overlap at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/?reduce=1");
    await waitForMap(page);
    await page.locator("#vp").scrollIntoViewIfNeeded();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1500);
    await page.addStyleTag({ content: visibleArtworkHitTesting });
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
    const result = await page.evaluate(({ width, height, acceptedPairs }) => {
      const collect = (selector: string) => [...document.querySelectorAll(selector)].map(el => ({
        el,
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
      const describe = (el: Element | null) => el ? JSON.stringify({
        tag: el.tagName, id: el.id, classes: el.getAttribute("class"),
        testId: el.getAttribute("data-testid"),
        marker: el.closest(".pin")?.getAttribute("data-testid") ?? null,
      }) : "null";
      // QA r9 gives no photo/photo criterion. At 390, require both overlapping
      // 小巨蛋/後山埤 photo pins to retain ownership of their own hit centres.
      if (width === 390) {
        for (const id of ["arena", "houshanpi"]) {
          const marker = document.querySelector(`[data-testid="metro-pin-${id}"]`)!;
          const r = marker.querySelector(".hit")!.getBoundingClientRect();
          const x = r.left + r.width / 2, y = r.top + r.height / 2;
          const top = document.elementFromPoint(x, y);
          if (!top || !marker.contains(top)) offenders.push(`photo:${id} viewport:${width}x${height} point:hit centre (${x}, ${y}) covering:${describe(top)}`);
        }
      }
      for (const [i, label] of labels.entries()) {
        const a = label.rect;
        if (a.left < vp.left || a.right > vp.right || a.top < vp.top || a.bottom > vp.bottom) offenders.push(`${label.name} outside #vp: ${JSON.stringify(a)}`);
        for (const other of [...labels.slice(i + 1), ...obstacles]) {
          const b = other.rect;
          if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
              Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) {
            if (accepted(label.key, other.key)) {
              // Allowlisted labels are checked independently below.
            } else {
              offenders.push(`${label.key} intersects ${other.key} by ${Math.min(a.right, b.right) - Math.max(a.left, b.left)}px horizontally and ${Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)}px vertically: ${JSON.stringify(a)} / ${JSON.stringify(b)}`);
            }
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
    }, { width: viewport.width, height: viewport.height, acceptedPairs });
    result.offenders.push(...await page.evaluate(checkLabelCharacters, {
      ...viewport,
      // 大橋頭 is isolated from neighbouring labels/photos; every point must hit it.
      names: ["大橋頭", ...new Set(acceptedPairs.filter(pair => pair.width === viewport.width)
        .flatMap(pair => [pair.a, pair.b]).filter(key => key.startsWith("label:"))
        .map(key => key.slice("label:".length)))],
    }));
    expect(result.count).toBe(STATION_COUNT);
    expect(result.offenders, result.offenders.join("\n")).toEqual([]);
  });
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`character check detects a photo moved over 小巨蛋 at ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/?reduce=1");
    await waitForMap(page);
    await page.locator("#vp").scrollIntoViewIfNeeded();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1500);
    await page.addStyleTag({ content: visibleArtworkHitTesting });
    const marker = page.getByTestId("metro-pin-houshanpi");
    const originalStyle = await marker.getAttribute("style");
    try {
      const failures = await page.evaluate(checkLabelCharacters, { ...viewport, names: ["小巨蛋"], movePhoto: true });
      expect(failures.some(failure => failure.includes('"id":"mapcard"')), failures.join("\n")).toBe(false);
      expect(failures.some(failure => failure.includes("label:小巨蛋") &&
        failure.includes(`viewport:${viewport.width}x${viewport.height}`) &&
        failure.includes('"marker":"metro-pin-houshanpi"')), failures.join("\n")).toBe(true);
    } finally {
      await marker.evaluate((el, style) => {
        if (style === null) el.removeAttribute("style");
        else el.setAttribute("style", style);
      }, originalStyle);
    }
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
