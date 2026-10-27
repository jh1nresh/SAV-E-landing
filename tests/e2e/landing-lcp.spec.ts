import { expect, test, type Page } from "@playwright/test";
import { noHorizontalOverflow } from "./helpers";

async function firstScreenAttrs(page: Page, testId: string) {
  const img = page.getByTestId(testId);
  await expect(img).toHaveCount(1);
  return {
    loading: await img.getAttribute("loading"),
    fetchPriority: (await img.getAttribute("fetchpriority")) ?? (await img.getAttribute("fetchPriority")),
    src: await img.getAttribute("src"),
  };
}

async function assertStaticFirstScreenHints(page: Page) {
  const zh = await firstScreenAttrs(page, "first-screen-phone-zh");
  const en = await firstScreenAttrs(page, "first-screen-phone-en");

  expect(zh.loading, "default-language first-screen loading").toBe("eager");
  expect(zh.fetchPriority, "default-language first-screen fetchpriority").toBe("high");
  expect(en.loading, "en first-screen twin must stay lazy").toBe("lazy");
  expect(en.fetchPriority, "en first-screen twin must not be high").not.toBe("high");
}

async function assertBelowFoldLazy(page: Page) {
  const below = page.locator(
    'img[src*="phones-zh-3"], img[src*="phones-en-3"], img[src*="phones-zh-4"], img[src*="phones-en-4"]',
  );
  const count = await below.count();
  expect(count).toBe(4);
  for (let i = 0; i < count; i++) {
    await expect(below.nth(i)).toHaveAttribute("loading", "lazy");
  }
}

test.describe("first-screen LCP hints and OSM credit", () => {
  for (const { name, viewport } of [
    { name: "desktop", viewport: { width: 1350, height: 940 } },
    { name: "mobile", viewport: { width: 390, height: 844 } },
  ]) {
    test(`${name} zh first-screen is eager+high; en twin and below-fold stay lazy`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const requested: string[] = [];
      page.on("request", (req) => {
        if (req.resourceType() === "image") requested.push(req.url());
      });
      await page.goto("/");
      await page.waitForLoadState("domcontentloaded");
      await assertStaticFirstScreenHints(page);
      await assertBelowFoldLazy(page);

      const phoneReqs = requested.filter((url) => /phones-(zh|en)-\d\.png/.test(url));
      expect(phoneReqs.some((url) => url.includes("phones-zh-2.png"))).toBeTruthy();
      expect(phoneReqs.some((url) => url.includes("phones-en-2.png")), "hidden en first-screen must not be fetched").toBeFalsy();
    });

    test(`${name} ?lang=en keeps static hints; en-2 loads when shown`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const requested: string[] = [];
      page.on("request", (req) => {
        if (req.resourceType() === "image") requested.push(req.url());
      });
      await page.goto("/?lang=en");
      await page.waitForLoadState("domcontentloaded");
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
      await assertStaticFirstScreenHints(page);
      await assertBelowFoldLazy(page);
      await page.getByTestId("first-screen-phone-en").scrollIntoViewIfNeeded();
      await expect(page.getByTestId("first-screen-phone-en")).toBeVisible();
      await page.waitForTimeout(500);

      const phoneReqs = requested.filter((url) => /phones-(zh|en)-\d\.png/.test(url));
      expect(phoneReqs.some((url) => url.includes("phones-en-2.png"))).toBeTruthy();
    });
  }

  for (const { label, viewport } of [
    { label: "1350x940", viewport: { width: 1350, height: 940 } },
    { label: "1440x900", viewport: { width: 1440, height: 900 } },
    { label: "1920x1080", viewport: { width: 1920, height: 1080 } },
    { label: "390x844", viewport: { width: 390, height: 844 } },
  ]) {
    test(`E-1 LCP at ${label} is not the map or a food photo`, async ({ page }) => {
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
          isFirstScreen: boolean;
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
                (n) => n.tagName === "H1" || n.tagName === "H2" || n.classList.contains("h"),
              ),
              isBadge: chain.some((n) => n.getAttribute("data-testid") === "hero-appstore"),
              isFirstScreen: chain.some((n) => {
                const id = n.getAttribute("data-testid");
                return id === "first-screen-phone-zh" || id === "first-screen-phone-en";
              }),
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
        lcp.isHeadline || lcp.isBadge || lcp.isFirstScreen,
        `${label} LCP was ${lcp.tag} ${lcp.src}`,
      ).toBeTruthy();
    });
  }

  test("OSM attribution link is present with the licence href", async ({ page }) => {
    await page.goto("/");
    const link = page.getByTestId("osm-attribution");
    await expect(link).toHaveText("Map data © OpenStreetMap contributors");
    await expect(link).toHaveAttribute("href", "https://www.openstreetmap.org/copyright");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
    await expect(link).toHaveCount(1);

    await page.goto("/?lang=en");
    await expect(page.getByTestId("osm-attribution")).toHaveAttribute(
      "href",
      "https://www.openstreetmap.org/copyright",
    );
    await expect(page.getByTestId("osm-attribution")).toHaveCount(1);
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
