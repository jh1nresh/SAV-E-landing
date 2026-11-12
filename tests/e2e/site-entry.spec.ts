import { expect, test } from "@playwright/test";

// Measure rendered colors, including opacity, rather than assuming theme tokens.
// WCAG 1.4.3: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
function contrastRatios(elements: Element[]) {
  const rgb = (value: string) => value.match(/[\d.]+/g)!.map(Number);
  const luminance = (channels: number[]) => channels.map(value => {
    const s = value / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
  return elements.map(element => {
    const style = getComputedStyle(element);
    let parent: Element | null = element;
    let background = [255, 255, 255];
    while (parent) {
      const color = rgb(getComputedStyle(parent).backgroundColor);
      if (color.length === 3 || color[3] === 1) { background = color.slice(0, 3); break; }
      parent = parent.parentElement;
    }
    const opacity = Number(style.opacity);
    const foreground = rgb(style.color).slice(0, 3).map((value, i) => value * opacity + background[i] * (1 - opacity));
    const [dark, light] = [luminance(foreground), luminance(background)].sort((a, b) => a - b);
    return { text: element.textContent, ratio: (light + 0.05) / (dark + 0.05) };
  });
}

for (const width of [375, 1280]) {
  test(`download status and language controls remain clear at ${width}px`, async ({ page }, testInfo) => {
    const height = width === 375 ? 667 : 800;
    await page.setViewportSize({ width, height });
    await page.goto("/taipei");
    for (const [label, language, description] of [
      ["中文", "zh-Hant", "iOS 測試版 · 透過 TestFlight 安裝"],
      ["EN", "en", "iOS beta · Install with TestFlight"],
    ] as const) {
      const button = page.locator("nav").getByRole("button", { name: label, exact: true });
      await button.focus();
      await page.keyboard.press("Enter");
      await expect(button).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator("html")).toHaveAttribute("lang", language);
      for (const control of await page.locator("nav button").all()) {
        const box = (await control.boundingBox())!;
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
        expect(await control.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(15);
      }
      await expect(page.locator(".download-note")).toHaveCount(2);
      const ids = await page.locator(".download-note").evaluateAll(notes => notes.map(note => note.id));
      expect(new Set(ids).size).toBe(2);
      await expect(page.locator("a.download-entry")).toHaveCount(2);
      await expect(page.locator(".hero .sub:visible")).toHaveCount(1);
      for (const entry of await page.locator(".download-entry").all()) {
        await expect(entry.locator(".download-note")).toBeVisible();
        await expect(entry.locator(".download-note")).toHaveText(description);
        await expect(entry).toHaveAccessibleName(language === "en" ? "Download on the App Store" : "在 App Store 下載");
        await expect(entry).toHaveAccessibleDescription(description);
        await expect(entry).toHaveAttribute("href", process.env.NEXT_PUBLIC_TESTFLIGHT_URL || "https://testflight.apple.com/join/aSVm9hRJ");
        await expect(entry).toHaveAttribute("rel", "noopener noreferrer");
      }
      const badge = (await page.locator('[data-testid="hero-appstore"] .badge').boundingBox())!;
      expect(badge.y).toBeGreaterThanOrEqual(0);
      expect(badge.y + badge.height).toBeLessThanOrEqual(height);
      const note = (await page.locator('[data-testid="hero-appstore"] .download-note').boundingBox())!;
      expect(note.y + note.height).toBeLessThanOrEqual(height);
      const artwork = (await page.locator('[data-testid="hero-appstore"] .badge img:visible').boundingBox())!;
      expect(note.y).toBeGreaterThanOrEqual(artwork.y + artwork.height);
      expect(note.y + note.height).toBeLessThanOrEqual(badge.y + badge.height + 1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const contrast = await page.locator('nav .chip[aria-pressed="true"], .hero .sub:visible, .download-note').evaluateAll(contrastRatios);
      expect(contrast).toHaveLength(4);
      for (const result of contrast) expect(result.ratio, result.text || "entry text").toBeGreaterThanOrEqual(4.5);
      await page.screenshot({ path: testInfo.outputPath(`entry-${width}-${language}.png`) });
    }
  });
}

test("qualified downloads retain the URL and native activation without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 667 } });
  try {
    const destination = process.env.NEXT_PUBLIC_TESTFLIGHT_URL || "https://testflight.apple.com/join/aSVm9hRJ";
    const page = await context.newPage();
    await page.goto("/taipei");
    await expect(page.locator("a.download-entry")).toHaveCount(2);
    for (const entry of await page.locator(".download-entry").all()) {
      await expect(entry.locator(".download-note")).toBeVisible();
      await expect(entry).toHaveAccessibleDescription("iOS 測試版 · 透過 TestFlight 安裝");
      await expect(entry).toHaveAttribute("href", destination);
      await expect(entry).toHaveAttribute("target", "_blank");
      await expect(entry).toHaveAttribute("rel", "noopener noreferrer");
    }
    // Keep the real URL contract above. Isolate native link activation from
    // TestFlight-specific browser/OS handling; this is not an installation test.
    const fixture = new URL("/__download-navigation-fixture", page.url()).href;
    await context.route(fixture, route => route.fulfill({ status: 200, contentType: "text/html", body: "<title>Beta invitation fixture</title>" }));
    await page.locator('[data-testid="hero-appstore"] .download-entry').evaluate((link, href) => link.setAttribute("href", href), fixture);
    const popupPromise = page.waitForEvent("popup");
    await page.locator('[data-testid="hero-appstore"] .download-note').click();
    const popup = await popupPromise;
    await expect(popup).toHaveURL(fixture);
    await expect(popup).toHaveTitle("Beta invitation fixture");
    await popup.close();
  } finally { await context.close(); }
});
