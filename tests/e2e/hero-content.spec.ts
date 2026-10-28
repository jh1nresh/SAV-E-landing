import { expect, test } from "@playwright/test";
import metro from "../../app/metro/metro.public.json";
import { countLabel, footNote, imageAlt, isExampleStore, isNewDate, stationIsNew, priceIsPending, stampLevel, stampNote, weekNewCount } from "../../lib/metro-logic.mjs";
import { clickPin, openStation, waitForCardOpen, waitForMap } from "./helpers";

test.describe("hero content and motion", () => {
  test("B-6 NEW on day 6, not on day 7 or 8 (Asia/Taipei, < 7 days), driven by the shipped data", async ({ page }) => {
    // Clocks are derived from the data (newest entry / newest station update), so adding or ageing
    // entries never needs a test edit. Expectations use the same pure rule the UI uses.
    const maxDate = (xs: Array<string | null>) => xs.filter((x): x is string => Boolean(x)).sort().pop()!;
    const addDays = (ymd: string, n: number) => {
      const d = new Date(`${ymd}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + n);
      return d.toISOString().slice(0, 10);
    };
    const anchors = [maxDate(metro.stores.map((x) => x.addedAt)), maxDate(metro.stations.map((x) => x.updatedAt))];
    const clocks = [...new Set(anchors.flatMap((a) => [0, 6, 7, 8].map((n) => addDays(a, n))))];

    for (const clock of clocks) {
      const weekCount = weekNewCount(metro.stores, clock);
      await page.goto(`/?clock=${clock}`);
      await waitForMap(page);
      expect(await page.evaluate(() => window.__savvyMap!.state().weekCount), `weekCount @${clock}`).toBe(weekCount);
      if (weekCount > 0) await expect(page.locator("#stampA")).toContainText(`本週新增 ${weekCount} 家`);
      else await expect(page.locator("#stampA")).toHaveText("");
      for (const st of metro.stations) {
        const pin = page.locator(`[data-testid=metro-pin-${st.id}]`);
        if (st.status === "live" && stationIsNew(metro.stores.filter((s) => s.stationId === st.id), clock)) await expect(pin, `${st.id} @${clock}`).toHaveClass(/new/);
        else await expect(pin, `${st.id} @${clock}`).not.toHaveClass(/new/);
      }
    }

    // Boundary of the newest entry itself: NEW through day 6, gone from day 7.
    const newest = maxDate(metro.stores.map((x) => x.addedAt));
    expect(isNewDate(newest, addDays(newest, 6))).toBe(true);
    expect(isNewDate(newest, addDays(newest, 7))).toBe(false);
    expect(isNewDate(newest, addDays(newest, 8))).toBe(false);
  });

  test("P-0 labels follow each entry's kind: example entries are labelled, post entries are not", async ({ page }) => {
    // Exercise both kinds present in the shipped data; synthetic edge cases stay in unit tests.
    await page.goto("/?reduce=1");
    await waitForMap(page);
    // Map-level stamp follows the data (P0-10): all example = full stamp, mixed = smaller 部分為範例, all post = none.
    const level = stampLevel(metro.stores);
    await expect(page.locator("#mapcard .stamp i")).toHaveCount(level === "none" ? 0 : 1);
    if (level !== "none") await expect(page.locator("#mapcard .stamp i")).toHaveText(stampNote(metro.stores));
    if (level === "partial") await expect(page.locator("#mapcard .stamp i")).toHaveClass(/partial/);
    else if (level === "example") {
      await expect(page.locator("#mapcard .stamp i")).toHaveText("範例資料 · 示意");
      await expect(page.locator("#mapcard .stamp i")).not.toHaveClass(/partial/);
    }

    for (const st of metro.stations.filter((x) => x.status === "live")) {
      const list = metro.stores.filter((x) => x.stationId === st.id);
      await expect(page.locator(`[data-testid=metro-pin-${st.id}]`)).toHaveAttribute("aria-label", new RegExp(`共 ${countLabel(list).replace(/[()（）]/g, "\\$&")}`));
      await openStation(page, st.id);
      await expect(page.locator("#card .ph-head .upd")).toContainText(`共 ${countLabel(list)}`);
      for (const [i, store] of list.entries()) {
        if (i > 0) await page.locator("#card .thumbs button").nth(i).click();
        await expect(page.locator("#card .fc h4")).toHaveText(store.name);
        await expect(page.locator("#card .cfoot")).toHaveText(footNote(store));
        if (isExampleStore(store)) {
          await expect(page.locator("#card .cfoot")).toContainText("價格為示意");
          await expect(page.locator("#card .fc .ph img")).toHaveAttribute("alt", imageAlt(store));
        } else {
          await expect(page.locator("#card .cfoot")).not.toContainText("價格為示意");
          await expect(page.locator("#card .fc .est")).not.toHaveText("示意");
          await expect(page.locator("#card .post-hours")).toHaveText(`營業時間：${store.hours || "未取得"}`);
          if (store.exit) await expect(page.locator("#card .walk")).toContainText(store.exit);
          if (store.exitWalkMin == null) await expect(page.locator("#card .walk")).toContainText("步行時間未取得");
        }
        const pending = priceIsPending(store);
        await expect(page.locator("#card .fc [data-testid=price-pending]")).toHaveCount(pending ? 1 : 0);
      }
    }
  });

  test("B-6 no-JS fallback does not paint a stale NEW count", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "__savvyMap", { configurable: true, value: undefined });
    });
    const html = await page.request.get("/");
    const body = await html.text();
    expect(body).not.toMatch(/本週新增\s+\d+\s*家/);
    // the static poster cannot know today's date, so it never prints 本週新增 (the live map paints it from the clock)
    expect(body).not.toContain("本週新增");
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

  test("E-1 LCP is the hero headline, badge, or first-screen app screenshot — not the map or a food photo", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
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
          resolve({
            tag: el?.tagName ?? "NONE",
            src,
            inMap: Boolean(el?.closest?.(".mapwrap, #mapcard, .map-slot, .map-stage")),
            isHeadline: Boolean(el?.closest?.("h1, .hero .txt .h")),
            isBadge: Boolean(el?.closest?.("[data-testid=hero-appstore]")),
            isFirstScreen: Boolean(
              el?.closest?.("[data-testid=first-screen-phone-zh], [data-testid=first-screen-phone-en]"),
            ),
            isFood: src.includes("/assets/food/") || Boolean(el?.closest?.(".ph, .fc .ph")),
          });
        }, 400);
      });
    });
    expect(lcp.inMap, `LCP was ${lcp.tag} inside the map`).toBeFalsy();
    expect(lcp.isFood, `LCP was food photo ${lcp.src}`).toBeFalsy();
    expect(
      lcp.isHeadline || lcp.isBadge || lcp.isFirstScreen,
      `LCP was ${lcp.tag} ${lcp.src}, expected headline, badge, or first-screen screenshot`,
    ).toBeTruthy();
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
