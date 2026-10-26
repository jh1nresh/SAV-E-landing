import { expect, test } from "@playwright/test";
import { clickPin, waitForCardOpen, waitForMap } from "./helpers";

test.describe("hero content and motion", () => {
  test("B-6 NEW on day 6, not on day 7 or 8 (Asia/Taipei, < 7 days)", async ({ page }) => {
    await page.goto("/?clock=2026-10-31");
    await waitForMap(page);
    await expect(page.locator("#stampA")).toContainText("本週新增");
    await expect(page.locator("[data-testid=metro-pin-houshanpi]")).toHaveClass(/new/);

    await page.goto("/?clock=2026-11-01");
    await waitForMap(page);
    await expect(page.locator("[data-testid=metro-pin-houshanpi]")).not.toHaveClass(/new/);
    const week7 = await page.evaluate(() => window.__savvyMap!.state().weekCount);
    expect(week7).toBe(0);

    await page.goto("/?clock=2026-11-02");
    await waitForMap(page);
    await expect(page.locator("[data-testid=metro-pin-houshanpi]")).not.toHaveClass(/new/);
  });

  test("B-6 no-JS fallback does not paint a stale NEW count", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "__savvyMap", { configurable: true, value: undefined });
    });
    const html = await page.request.get("/");
    const body = await html.text();
    expect(body).not.toMatch(/本週新增\s+\d+\s*家/);
    expect(body).not.toContain("INTERNAL_NOTE_MUST_NOT_SHIP");
    expect(body.includes('"not' + 'es"')).toBeFalsy();
  });

  test("F-2 / (d) forbidden strings are absent", async ({ page }) => {
    const res = await page.goto("/");
    const html = (await res?.text()) ?? "";
    expect(html).not.toContain("本機互動原型");
    expect(html).not.toContain("10/25 預定");
    await waitForMap(page);
    await expect(page.locator("body")).not.toContainText("本機互動原型");
    await expect(page.locator("body")).not.toContainText("10/25 預定");
  });

  test("B-4 no Google hosts on first load", async ({ page }) => {
    const hosts: string[] = [];
    page.on("request", (req) => {
      try {
        hosts.push(new URL(req.url()).host);
      } catch {
        /* ignore */
      }
    });
    await page.goto("/");
    await waitForMap(page);
    const banned = hosts.filter((h) => /googleapis|gstatic|maps\.google/.test(h));
    expect(banned).toEqual([]);
  });

  test("A-4 first-screen requests stay first-party", async ({ page }, testInfo) => {
    const reqs: { url: string; host: string }[] = [];
    page.on("request", (req) => {
      try {
        const u = new URL(req.url());
        reqs.push({ url: u.href, host: u.host });
      } catch {
        /* ignore */
      }
    });
    const response = await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const html = (await response?.text()) ?? "";
    expect(Buffer.byteLength(html, "utf8")).toBeLessThan(500 * 1024);
    const firstParty = reqs.filter((r) => r.host && !["127.0.0.1", "localhost"].includes(r.host.split(":")[0]));
    await testInfo.attach("first-screen-requests.json", {
      body: JSON.stringify({ htmlBytes: Buffer.byteLength(html, "utf8"), reqs, thirdParty: firstParty }, null, 2),
      contentType: "application/json",
    });
    expect(firstParty).toEqual([]);
  });

  test("E-1 LCP is the hero headline or badge, not the map", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1500);
    const lcp = await page.evaluate(() => {
      return new Promise<{
        tag: string;
        inMap: boolean;
        isHeadline: boolean;
        isBadge: boolean;
      }>((resolve) => {
        let last: PerformanceEntry & { element?: Element } | undefined;
        const po = new PerformanceObserver((list) => {
          last = list.getEntries().at(-1) as PerformanceEntry & { element?: Element };
        });
        po.observe({ type: "largest-contentful-paint", buffered: true });
        setTimeout(() => {
          po.disconnect();
          const el = last?.element as HTMLElement | undefined;
          resolve({
            tag: el?.tagName ?? "NONE",
            inMap: Boolean(el?.closest?.(".mapwrap, #mapcard, .map-slot")),
            isHeadline: Boolean(el?.closest?.("h1, .hero .txt .h")),
            isBadge: Boolean(el?.closest?.("[data-testid=hero-appstore]")),
          });
        }, 400);
      });
    });
    expect(lcp.inMap, `LCP was ${lcp.tag} inside the map`).toBeFalsy();
    expect(lcp.isHeadline || lcp.isBadge, `LCP was ${lcp.tag}, expected headline or badge`).toBeTruthy();
  });

  test("D-5 reduced-motion via media query fades without flying", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await waitForMap(page);
    await clickPin(page, "houshanpi");
    const state = await page.evaluate(() => window.__savvyMap!.state());
    expect(state.reduced).toBeTruthy();
    await waitForCardOpen(page);
    await expect(page.locator("#card")).toHaveClass(/rm/);
  });

  test("D-5 ?reduce also disables fly/morph", async ({ page }) => {
    await page.goto("/?reduce=1");
    await waitForMap(page);
    const state = await page.evaluate(() => window.__savvyMap!.state());
    expect(state.reduced).toBeTruthy();
    await clickPin(page, "shuanglian");
    await waitForCardOpen(page);
    await expect(page.locator("#card")).toHaveClass(/rm/);
  });

  test("F-1 metadata includes title description and OG image", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Savvy: Turn links into pins/);
    const desc = await page.locator('meta[name="description"]').getAttribute("content");
    expect(desc).toMatch(/Savvy/);
    const og = await page.locator('meta[property="og:image"]').getAttribute("content");
    expect(og).toMatch(/og\.png/);
  });
});
