import { expect, test } from "@playwright/test";
import { getPublicMetroData } from "../../lib/metro";
const metro = getPublicMetroData();
import { countLabel, imageAlt, isExampleStore, isNewDate, stationIsNew, priceIsPending, stampLevel, stampNote, weekNewCount } from "../../lib/metro-logic.mjs";
import { clickPin, openStation, waitForCardOpen, waitForMap } from "./helpers";

test.describe("hero content and motion", () => {
  test("B-6 NEW on day 6, not on day 7 or 8 (Asia/Taipei, < 7 days), driven by the shipped data", async ({ context }) => {
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
      const page = await context.newPage();
      const weekCount = weekNewCount(metro.stores, clock);
      await page.goto(`/discover?clock=${clock}`);
      await waitForMap(page);
      expect(await page.evaluate(() => window.__savvyMap!.state().weekCount), `weekCount @${clock}`).toBe(weekCount);
      if (weekCount > 0) await expect(page.locator("#stampA")).toContainText(`本週新增 ${weekCount} 家`);
      else await expect(page.locator("#stampA")).toHaveText("");
      for (const st of metro.stations) {
        const pin = page.locator(`[data-testid=metro-pin-${st.id}]`);
        if (st.status === "live" && stationIsNew(metro.stores.filter((s) => s.stationId === st.id), clock)) await expect(pin, `${st.id} @${clock}`).toHaveClass(/new/);
        else await expect(pin, `${st.id} @${clock}`).not.toHaveClass(/new/);
      }
      await page.close();
    }

    // Boundary of the newest entry itself: NEW through day 6, gone from day 7.
    const newest = maxDate(metro.stores.map((x) => x.addedAt));
    expect(isNewDate(newest, addDays(newest, 6))).toBe(true);
    expect(isNewDate(newest, addDays(newest, 7))).toBe(false);
    expect(isNewDate(newest, addDays(newest, 8))).toBe(false);
  });

  test("P-0 labels follow each entry's kind: example entries are labelled, post entries are not", async ({ page }) => {
    // WebKit walked every live station and hit the 60s default on CI run 43427323912.
    test.setTimeout(120_000);
    // Exercise both kinds present in the shipped data; synthetic edge cases stay in unit tests.
    await page.goto("/discover?reduce=1");
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
      const marker = page.locator(`[data-testid=metro-pin-${st.id}]`);
      if (list.length) {
        await expect(marker).toHaveAttribute("aria-label", new RegExp(`共 ${countLabel(list).replace(/[()（）]/g, "\\$&")}`));
      } else {
        await expect(marker).not.toHaveAttribute("aria-label", /共 0 間/);
      }
      await openStation(page, st.id);
      if (list.length) {
        await expect(page.locator("#card .thumbs .more")).toContainText(`共 ${countLabel(list)}`);
      } else {
        await expect(page.locator("#card")).not.toContainText("共 0 間");
      }
      for (const [i, store] of list.entries()) {
        if (i > 0) await page.locator("#card .thumbs button").nth(i).click();
        await expect(page.locator("#card .fc h4")).toHaveText(store.name);
        await expect(page.locator("#card dt")).toHaveText(["地址", "價格"]);
        await expect(page.locator("#card .fc .ph img")).toHaveAttribute("alt", imageAlt(store));
        await expect(page.locator("#card .cfoot, #card .walk, #card .post-hours, #card .src")).toHaveCount(0);
        if (store.article) {
          await expect(page.locator("#card dd")).toHaveText([store.article.address?.trim() || "地址待確認", store.article.price?.trim() || "價格待確認"]);
        } else if (isExampleStore(store) && !priceIsPending(store)) {
          await expect(page.locator("#card dd").last()).toContainText("示意");
        }
        const pending = !store.article && priceIsPending(store);
        await expect(page.locator("#card .fc [data-testid=price-pending]")).toHaveCount(pending ? 1 : 0);
      }
    }
  });

  test("B-6 no-JS fallback does not paint a stale NEW count", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "__savvyMap", { configurable: true, value: undefined });
    });
    const html = await page.request.get("/discover");
    const body = await html.text();
    expect(body).not.toMatch(/本週新增\s+\d+\s*家/);
    // the static poster cannot know today's date, so it never prints 本週新增 (the live map paints it from the clock)
    expect(body).not.toContain("本週新增");
    expect(body).not.toContain("INTERNAL_NOTE_MUST_NOT_SHIP");
    expect(body.includes('"not' + 'es"')).toBeFalsy();
  });

  test("F-2 / (d) forbidden strings are absent", async ({ page }) => {
    const res = await page.goto("/discover");
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
    await page.goto("/discover");
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
    const response = await page.goto("/discover");
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

  test("D-5 reduced-motion via media query fades without flying", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/discover");
    await waitForMap(page);
    await clickPin(page, "houshanpi");
    const state = await page.evaluate(() => window.__savvyMap!.state());
    expect(state.reduced).toBeTruthy();
    await waitForCardOpen(page);
    await expect(page.locator("#card")).toHaveClass(/rm/);
  });

  test("D-5 ?reduce also disables fly/morph", async ({ page }) => {
    await page.goto("/discover?reduce=1");
    await waitForMap(page);
    const state = await page.evaluate(() => window.__savvyMap!.state());
    expect(state.reduced).toBeTruthy();
    await clickPin(page, "shuanglian");
    await waitForCardOpen(page);
    await expect(page.locator("#card")).toHaveClass(/rm/);
  });

  test("F-1 metadata includes title description and OG image", async ({ context }) => {
    const zh = await context.newPage();
    await zh.goto("/discover");
    await expect(zh).toHaveTitle("台北捷運美食地圖｜Savvy");
    await expect(zh.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      "在台北捷運美食地圖選站，查看站邊店家與完整攻略。",
    );
    await expect(zh.locator('meta[property="og:title"]')).toHaveAttribute("content", "台北捷運美食地圖｜Savvy");
    await expect(zh.getByRole("heading", { level: 1 })).toHaveText("捷運美食地圖");
    const og = await zh.locator('meta[property="og:image"]').getAttribute("content");
    expect(og).toMatch(/\/assets\/savvy-share-sakura\.png/);
    await zh.close();

    const en = await context.newPage();
    await en.goto("/discover?lang=en");
    await expect(en).toHaveTitle("Taipei MRT food map | Savvy");
    await expect(en.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      "Choose a Taipei MRT station to find nearby restaurants and food guides.",
    );
    await expect(en.getByRole("heading", { level: 1 })).toHaveText("Metro food map");
    await en.close();
  });
});
