import { expect, test, type Page } from "@playwright/test";
import { noHorizontalOverflow } from "./helpers";

async function assertChooserPhoto(page: Page) {
  const img = page.getByTestId("choose-photo");
  await expect(img).toHaveCount(1);
  expect(await img.getAttribute("loading"), "chooser photo is the LCP candidate").not.toBe("lazy");
  expect((await img.getAttribute("fetchpriority")) ?? (await img.getAttribute("fetchPriority"))).toBe("high");
  expect(Number(await img.getAttribute("width"))).toBeGreaterThan(0);
  expect(Number(await img.getAttribute("height"))).toBeGreaterThan(0);
  await expect(page.locator('img[src*="phones-"]')).toHaveCount(0);
}

test.describe("first-screen LCP hints and OSM credit", () => {
  for (const { name, viewport } of [
    { name: "desktop", viewport: { width: 1350, height: 940 } },
    { name: "mobile", viewport: { width: 390, height: 844 } },
  ]) {
    test(`${name} chooser photo is the high-priority image and phone mocks are absent`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const requested: string[] = [];
      page.on("request", (req) => {
        if (req.resourceType() === "image") requested.push(req.url());
      });
      await page.goto("/");
      await page.waitForLoadState("domcontentloaded");
      await assertChooserPhoto(page);
      expect(requested.some((url) => /phones-(zh|en)-\d\.png/.test(url)), "old phone mocks must not download").toBeFalsy();
      expect(requested.some((url) => url.includes("/metro/images/") && url.includes("heidian")), "the default note photo is requested").toBeTruthy();
    });

    test(`${name} ?lang=en keeps the same chooser photo priority`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto("/?lang=en");
      await page.waitForLoadState("domcontentloaded");
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
      await assertChooserPhoto(page);
      await expect(page.getByTestId("choose-result")).toBeVisible();
    });
  }

  for (const { label, viewport } of [
    { label: "1350x940", viewport: { width: 1350, height: 940 } },
    { label: "1440x900", viewport: { width: 1440, height: 900 } },
    { label: "1920x1080", viewport: { width: 1920, height: 1080 } },
    { label: "390x844", viewport: { width: 390, height: 844 } },
  ]) {
    test(`E-1 LCP at ${label} is the chooser, headline, or badge — not the map`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto("/");
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(1500);
      const lcp = await page.evaluate(() => {
        return new Promise<{
          tag: string;
          src: string;
          inMap: boolean;
          isHeadline: boolean;
          isBadge: boolean;
          isChooser: boolean;
          isFood: boolean;
        }>((resolve) => {
          let last: PerformanceEntry & { element?: Element } | undefined;
          const po = new PerformanceObserver((list) => {
            last = list.getEntries().at(-1) as PerformanceEntry & { element?: Element };
          });
          po.observe({ type: "largest-contentful-paint", buffered: true });
          setTimeout(() => {
            po.disconnect();
            const el = last?.element as HTMLElement | undefined;
            const src = el instanceof HTMLImageElement ? el.getAttribute("src") ?? "" : "";
            // WebKit reports LCP as the inner <span> of a heading (hero h1
            // or a first-viewport .h title such as s2's underline span).
            // Walk ancestors with simple tag/class/id checks; closest()
            // with a descendant combinator in a selector list misses that span.
            const chain: Element[] = [];
            for (let n: Element | null | undefined = el; n; n = n.parentElement) chain.push(n);
            resolve({
              tag: el?.tagName ?? "NONE",
              src,
              inMap: chain.some(
                (n) =>
                  n.id === "vp" ||
                  n.id === "mapcard" ||
                  n.classList.contains("mapwrap") ||
                  n.classList.contains("map-slot") ||
                  n.classList.contains("map-stage") ||
                  n.getAttribute("data-testid") === "metro-vp" ||
                  n.getAttribute("data-testid") === "metro-map" ||
                  n.getAttribute("data-testid") === "metro-map-slot",
              ),
              isHeadline: chain.some(
                (n) =>
                  n.tagName === "H1" ||
                  n.tagName === "H2" ||
                  n.classList.contains("h") ||
                  (n.classList.contains("sub") && chain.some((p) => p.classList.contains("hero") || p.id === "hero")),
              ),
              isBadge: chain.some((n) => n.getAttribute("data-testid") === "hero-appstore"),
              isChooser: chain.some((n) => n.getAttribute("data-testid") === "choose-photo" || n.id === "choose" || n.classList.contains("choose-stage")),
              isFood:
                src.includes("/assets/food/") ||
                chain.some((n) => n.classList.contains("ph")),
            });
          }, 400);
        });
      });
      expect(lcp.inMap, `${label} LCP was ${lcp.tag} inside the map`).toBeFalsy();
      expect(lcp.isFood, `${label} LCP was food photo ${lcp.src}`).toBeFalsy();
      expect(
        lcp.isHeadline || lcp.isBadge || lcp.isChooser,
        `${label} LCP was ${lcp.tag} ${lcp.src}`,
      ).toBeTruthy();
    });
  }

  test("OSM attribution link is present with the licence href", async ({ context }) => {
    const zh = await context.newPage();
    await zh.goto("/");
    const link = zh.getByTestId("osm-attribution");
    await expect(link).toHaveText("Map data © OpenStreetMap contributors");
    await expect(link).toHaveAttribute("href", "https://www.openstreetmap.org/copyright");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
    await expect(link).toHaveCount(1);
    await zh.close();

    const en = await context.newPage();
    await en.goto("/?lang=en");
    await expect(en.getByTestId("osm-attribution")).toHaveAttribute(
      "href",
      "https://www.openstreetmap.org/copyright",
    );
    await expect(en.getByTestId("osm-attribution")).toHaveCount(1);
    await en.close();
  });

  for (const width of [375, 390]) {
    test(`OSM footer does not overflow at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/");
      await page.locator("footer.site").scrollIntoViewIfNeeded();
      await expect(page.getByTestId("osm-attribution")).toBeVisible();
      await noHorizontalOverflow(page);
    });
  }
});
