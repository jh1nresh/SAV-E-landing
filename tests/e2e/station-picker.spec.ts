import { expect, test } from "@playwright/test";
import { getFoodStations, getPublicMetroData, getShanghaiFoodStations } from "../../lib/metro";
import { buildPickerStations, compareNewest, latestStation, TAIPEI_LINE_COLOR, withFixtureCount } from "../../lib/station-picker.mjs";
import { buildSearchIndex, filterStations } from "../../lib/station-search.mjs";
import { heroMapPins, mapOnlyIn, newestPackage, publicationSets, publishedIn, SHANGHAI_HERO_HOLDOUTS } from "../metro-publication.mjs";
import { waitForCardOpen, waitForMap } from "./helpers";

const publication = publicationSets(".");
const publishedTaipei = publishedIn(publication, "taipei");
const publishedShanghai = publishedIn(publication, "shanghai");
const shanghaiHeroPins = heroMapPins(publication.mapOnly);
/** Stations the Shanghai hero draws today: the five published stations plus the three that are still map-only. 南京東路 stays off this list. */
const SHANGHAI_HERO_NAMES = ["豫園", "靜安寺", "黃陂南路", "交通大學", "打浦橋", "南京西路", "陸家嘴", "徐家匯"] as const;
const SHANGHAI_EITHER_PUBLISHED_OR_MAP_ONLY = ["南京西路", "陸家嘴", "徐家匯"] as const;
const taipei = buildPickerStations(getFoodStations(), getPublicMetroData().stations, TAIPEI_LINE_COLOR).sort(compareNewest);
const shanghai = buildPickerStations(getShanghaiFoodStations(), []).sort(compareNewest);

function stationIdentity(stations: { n: number; slug: string }[]) {
  return stations.map((station) => `${station.n}:${station.slug}`).sort();
}
const newest = latestStation(taipei)!;
const oldest = taipei[taipei.length - 1]!;
const middle = taipei[Math.floor(taipei.length / 2)]!;

async function boxBottom(page: import("@playwright/test").Page, selector: string) {
  return page.locator(selector).evaluate((el) => {
    const rect = el.getBoundingClientRect();
    return rect.y + rect.height;
  });
}

test("default trigger is the newest station and does not open its card", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/metro");
  await waitForMap(page);
  const trigger = page.getByTestId("station-picker-trigger");
  await expect(trigger).toContainText(`第 ${newest.n} 站`);
  await expect(trigger).toContainText(newest.station);
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#card")).toBeHidden();
  await expect(page.locator(".pin.picked")).toHaveCount(1);
  await expect(page.locator(`[data-testid="metro-pin-${newest.selectId}"]`)).toHaveClass(/picked/);
});

test("choosing newest, oldest, and a middle station updates the trigger, pin, and card", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/metro");
  await waitForMap(page);
  for (const station of [oldest, middle, newest]) {
    await page.getByTestId("station-picker-trigger").click();
    await page.evaluate(() => {
      // Delay card opening to reproduce focus loss on a busy main thread.
      document.addEventListener("click", () => {
        const until = performance.now() + 400;
        while (performance.now() < until) {}
      }, { once: true });
    });
    await page.getByTestId(`station-option-${station.selectId}`).click();
    await expect(page.getByTestId("station-picker-trigger")).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByTestId("station-picker-trigger")).toBeFocused();
    await expect(page.getByTestId("station-picker-trigger")).toContainText(station.station);
    await expect(page).toHaveURL(new RegExp(`#${station.slug}$`));
    await expect(page.locator(".pin.picked")).toHaveCount(1);
    await expect(page.locator(`[data-testid="metro-pin-${station.selectId}"]`)).toHaveClass(/picked/);
    await waitForCardOpen(page);
    await expect(page.getByTestId("station-picker-trigger")).toBeFocused();
    await expect(page.locator("#cardTitle")).toContainText(station.station);
    const srcs = await page.locator("#card img").evaluateAll((els) => els.map((el) => el.getAttribute("src")).filter((src): src is string => Boolean(src)));
    expect(srcs.length).toBeGreaterThan(0);
    for (const src of srcs) {
      const image = await page.request.get(new URL(src, page.url()).href);
      expect(image.status(), src).toBeLessThan(400);
    }
  }
});

test("a station hash preselects that station without adding history entries", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/metro#${middle.slug}`);
  await waitForMap(page);
  await waitForCardOpen(page);
  await expect(page.getByTestId("station-picker-trigger")).toContainText(middle.station);
  await expect(page.locator(`[data-testid="metro-pin-${middle.selectId}"]`)).toHaveClass(/picked/);
  const before = await page.evaluate(() => history.length);
  await page.getByTestId("station-picker-trigger").click();
  await page.getByTestId(`station-option-${oldest.selectId}`).click();
  await expect(page).toHaveURL(new RegExp(`#${oldest.slug}$`));
  expect(await page.evaluate(() => history.length)).toBe(before);
});

test("Escape closes the panel and a second Escape leaves focus on the trigger", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/metro");
  await waitForMap(page);
  const trigger = page.getByTestId("station-picker-trigger");
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(trigger).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await expect(page.locator("header, nav.top").locator(":focus")).toHaveCount(0);
});

test("desktop panel does not push the map and stays within 300px", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/metro");
  await waitForMap(page);
  const before = (await page.locator(".map-stage").boundingBox())!;
  await page.getByTestId("station-picker-trigger").click();
  const sheet = page.locator(".sd-sheet");
  await expect(sheet).toBeVisible();
  const box = (await sheet.boundingBox())!;
  expect(box.height).toBeLessThanOrEqual(300);
  const after = (await page.locator(".map-stage").boundingBox())!;
  expect(Math.abs(after.y - before.y)).toBeLessThan(2);
});

test("mobile sheet closes from the scrim", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/metro");
  await waitForMap(page);
  const trigger = page.getByTestId("station-picker-trigger");
  await trigger.click();
  await expect(page.getByText("找一站", { exact: true }).last()).toBeVisible();
  const backdrop = page.locator(".sd-backdrop");
  await expect(backdrop).toBeVisible();
  const option = page.getByTestId("station-search").getByRole("option").first();
  expect((await option.boundingBox())!.height).toBeGreaterThanOrEqual(48);
  await backdrop.click({ position: { x: 20, y: 20 } });
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(trigger).toBeFocused();
});

test.describe("no-JS station list", () => {
  test.use({ javaScriptEnabled: false });

  test("lists every station as a link and does not print a weekly count", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/metro");
  const links = page.getByTestId("station-fallback").locator("a");
  await expect(links).toHaveCount(taipei.length);
  await expect(links.first()).toHaveAttribute("href", `/metro/${newest.slug}`);
  for (const link of await links.all()) {
    expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  const html = await page.content();
  expect(html).not.toContain("本週新增");
  const stamp = (await page.locator(".sd-dock .stamp").boundingBox())!;
  const linkBox = (await links.first().boundingBox())!;
  const overlaps = stamp.x < linkBox.x + linkBox.width && stamp.x + stamp.width > linkBox.x
    && stamp.y < linkBox.y + linkBox.height && stamp.y + stamp.height > linkBox.y;
  expect(overlaps).toBe(false);
  });
});

for (const [width, height] of [[390, 844], [1280, 800], [1440, 900]] as const) {
  test(`Station selector stays on the first screen at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/metro");
    await waitForMap(page);
    const bottom = await boxBottom(page, "[data-testid=station-picker-trigger]");
    expect(bottom).toBeLessThanOrEqual(height);
    const top = await page.getByTestId("station-picker-trigger").evaluate((el) => el.getBoundingClientRect().top);
    expect(top).toBeGreaterThanOrEqual(0);
  });
}

function intersects(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

test("every Taipei pin and name is on the first screen at 1280x800", async ({ page }) => {
  expect(publishedTaipei.length).toBeGreaterThanOrEqual(23);
  expect(taipei.length).toBeGreaterThanOrEqual(23);
  expect(stationIdentity(taipei), "published Taipei stations").toEqual(stationIdentity(publishedTaipei));
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/metro");
  await waitForMap(page);
  const pins = page.locator("[data-testid^=metro-pin-]");
  await expect(pins).toHaveCount(publishedTaipei.length);
  for (const station of taipei) {
    const pin = page.locator(`[data-testid="metro-pin-${station.selectId}"] .ph`);
    await expect(pin, station.station).toHaveCount(1);
    await expect.poll(() => pin.evaluate((el) => el.getBoundingClientRect().height), { timeout: 15_000 }).toBeGreaterThan(10);
    const box = await pin.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom };
    });
    expect(box.top, station.station).toBeGreaterThanOrEqual(0);
    expect(box.bottom, station.station).toBeLessThanOrEqual(800);
  }
  const labels = await page.evaluate(() => [...document.querySelectorAll("#stdots text")].map((el) => {
    const rect = el.getBoundingClientRect();
    return { name: el.textContent ?? "", top: rect.top, bottom: rect.bottom };
  }));
  // The map paints the metro station name. A few differ from the food title, such as 松山 for 饒河/松山.
  const mapNames = getPublicMetroData().stations
    .filter((station) => taipei.some((food) => food.slug === station.slug))
    .map((station) => station.name);
  expect(mapNames).toHaveLength(publishedTaipei.length);
  expect(labels).toHaveLength(publishedTaipei.length);
  for (const name of mapNames) {
    const label = labels.find((item) => item.name === name);
    expect(label, name).toBeTruthy();
    expect(label!.top, name).toBeGreaterThanOrEqual(0);
    expect(label!.bottom, name).toBeLessThanOrEqual(800);
  }
});

test("the weekly stamp does not cover 國父紀念館 at 390", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/metro?clock=2026-11-13");
  await waitForMap(page);
  expect(taipei.some((station) => station.station === "國父紀念館")).toBe(true);
  const stamp = (await page.locator("#stamp").boundingBox())!;
  await expect(page.locator("#stampA")).toHaveText("本週新增 30 家");
  const hits = await page.evaluate(() => {
    const stampRect = document.querySelector("#stamp")!.getBoundingClientRect();
    const overlaps = (rect: DOMRect) => stampRect.left < rect.right && stampRect.right > rect.left
      && stampRect.top < rect.bottom && stampRect.bottom > rect.top;
    return [...document.querySelectorAll("#stdots text")].flatMap((el) => {
      const rect = el.getBoundingClientRect();
      return overlaps(rect) ? [el.textContent ?? ""] : [];
    });
  });
  expect(hits, "stamp covers a station name").toEqual([]);
  const memorial = await page.evaluate(() => {
    const el = [...document.querySelectorAll("#stdots text")].find((node) => node.textContent === "國父紀念館");
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });
  expect(memorial).not.toBeNull();
  expect(intersects(stamp, memorial!)).toBe(false);
});

for (const viewport of [{ width: 1280, height: 800 }, { width: 1440, height: 900 }]) {
  test(`every Shanghai pin is on the first screen at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    expect(publishedShanghai.length).toBeGreaterThanOrEqual(5);
    expect(stationIdentity(shanghai), "published Shanghai stations").toEqual(stationIdentity(publishedShanghai));
    const names = [...shanghai.map((station) => station.station), ...shanghaiHeroPins.map((station) => station.station)];
    expect(names).toHaveLength(8);
    for (const name of SHANGHAI_HERO_NAMES) expect(names, name).toContain(name);
    expect([...names].sort()).toEqual([...SHANGHAI_HERO_NAMES].sort());
    for (const name of SHANGHAI_EITHER_PUBLISHED_OR_MAP_ONLY) {
      const published = publishedShanghai.some((station) => station.station === name);
      const mapOnly = mapOnlyIn(publication, "shanghai").some((station) => station.station === name);
      expect(published !== mapOnly, name).toBe(true);
    }
    await page.setViewportSize(viewport);
    await page.goto("/shanghai?reduce=1");
    await waitForMap(page);
    await page.evaluate(() => {
      window.__savvyMap?.closeCard({ focus: false });
      window.__savvyMap?.goHome();
    });
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator(".pin")).toHaveCount(names.length);
    await expect(page.locator(".pin.content-only")).toHaveCount(shanghaiHeroPins.length);
    for (const station of shanghaiHeroPins) {
      await expect(page.getByTestId(`metro-pin-${station.slug}`), station.station).toHaveClass(/content-only/);
    }
    await expect(page.locator("#stdots text", { hasText: "南京東路" })).toHaveCount(0);
    await expect(page.getByTestId("metro-pin-shanghai-nanjing-east")).toHaveCount(0);
    for (const holdout of mapOnlyIn(publication, "shanghai").filter((entry) => SHANGHAI_HERO_HOLDOUTS.has(entry.slug))) {
      await expect(page.locator("#stdots text", { hasText: holdout.station })).toHaveCount(0);
    }
    for (const pin of await page.locator(".pin:not(.content-only) .ph").all()) {
      const box = (await pin.boundingBox())!;
      const id = await pin.evaluate((el) => el.closest("button")?.getAttribute("data-testid") ?? "shanghai-pin");
      expect(box.y, id).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height, id).toBeLessThanOrEqual(viewport.height);
    }
    const layout = await page.evaluate(() => {
      const boxOf = (el: SVGGraphicsElement) => {
        const b = el.getBBox();
        const m = el.getScreenCTM();
        if (!m) return null;
        const pts = [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]]
          .map(([x, y]) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]);
        const xs = pts.map((p) => p[0]);
        const ys = pts.map((p) => p[1]);
        return { name: el.textContent?.trim() ?? "", left: Math.min(...xs), top: Math.min(...ys), right: Math.max(...xs), bottom: Math.max(...ys) };
      };
      const labels = [...document.querySelectorAll<SVGGraphicsElement>("#stdots text")].map(boxOf).filter((box): box is NonNullable<typeof box> => !!box);
      const overlaps: string[] = [];
      for (let i = 0; i < labels.length; i++) {
        for (let j = i + 1; j < labels.length; j++) {
          const a = labels[i];
          const b = labels[j];
          const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
          const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          if (w > 1 && h > 1) overlaps.push(`${a.name} overlaps ${b.name} by ${w.toFixed(1)}×${h.toFixed(1)}`);
        }
      }
      return { labels, overlaps };
    });
    expect(layout.labels.map((label) => label.name)).toEqual(expect.arrayContaining(names));
    expect(layout.labels).toHaveLength(names.length);
    expect(layout.labels.find((label) => label.name === "打浦橋")?.name).toBe("打浦橋");
    expect(layout.overlaps).toEqual([]);
    for (const label of layout.labels) {
      expect(label.top, label.name).toBeGreaterThanOrEqual(-1);
      expect(label.bottom, label.name).toBeLessThanOrEqual(viewport.height + 1);
      expect(label.left, label.name).toBeGreaterThanOrEqual(-1);
      expect(label.right, label.name).toBeLessThanOrEqual(viewport.width + 1);
    }
  });
}

test("a Shanghai station without a food package stays a map dot and does not invent a guide", async ({ page }) => {
  expect([...SHANGHAI_HERO_NAMES]).toEqual(["豫園", "靜安寺", "黃陂南路", "交通大學", "打浦橋", "南京西路", "陸家嘴", "徐家匯"]);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/shanghai?reduce=1");
  await waitForMap(page);
  await expect(page.locator(".pin")).toHaveCount(SHANGHAI_HERO_NAMES.length);
  await expect(page.locator("#stdots text", { hasText: "南京東路" })).toHaveCount(0);
  await expect(page.getByTestId("metro-pin-shanghai-nanjing-east")).toHaveCount(0);

  if (shanghaiHeroPins.length > 0) {
    for (const station of shanghaiHeroPins) {
      const pin = page.getByTestId(`metro-pin-${station.slug}`);
      await expect(pin, station.station).toHaveClass(/content-only/);
      // A coordinate click lands on the hero when it covers a lower dot, so the
      // pin never receives it. Activate the button itself; that is the handler
      // that opens the card.
      await pin.evaluate((button: HTMLButtonElement) => button.click());
      const card = page.getByTestId("metro-card");
      await expect(card).toContainText(station.station);
      await expect(card).toContainText("這一站的店家資料準備中");
      await expect(card.locator("a")).toHaveCount(0);
      expect(new URL(page.url()).pathname).toBe("/shanghai");
    }
  } else {
    await expect(page.locator(".pin.content-only")).toHaveCount(0);
    for (const name of SHANGHAI_HERO_NAMES) {
      const entry = publication.design.find((station) => station.city === "shanghai" && station.station === name);
      expect(entry, name).toBeTruthy();
      const pin = page.getByTestId(`metro-pin-${entry!.slug}`);
      await expect(pin, name).toHaveCount(1);
      await expect(pin, name).not.toHaveClass(/content-only/);
      await expect(page.locator("#stdots text", { hasText: name })).toHaveCount(1);
      await pin.evaluate((button: HTMLButtonElement) => button.click());
      const card = page.getByTestId("metro-card");
      await expect(card, name).toContainText(name);
      await expect(card, name).not.toContainText("準備中");
    }
    await expect(page.getByText("準備中")).toHaveCount(0);
  }
});

test("shanghai dropdown lists the published stations and selects the newest", async ({ page }) => {
  expect(publishedShanghai.length).toBeGreaterThanOrEqual(5);
  expect(stationIdentity(shanghai), "published Shanghai stations").toEqual(stationIdentity(publishedShanghai));
  expect(shanghai.find((station) => station.slug === "shanghai-dapuqiao")?.station).toBe("打浦橋");
  const newest = latestStation(shanghai);
  const newestContent = newestPackage(publication, "shanghai");
  expect(newest?.n).toBe(newestContent?.n);
  expect(newest?.slug).toBe(newestContent?.slug);
  expect(shanghai.some((station) => station.station.includes("人民廣場"))).toBe(false);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/shanghai");
  expect(await page.content()).not.toContain("人民廣場");
  const trigger = page.getByTestId("station-picker-trigger");
  await expect(trigger).toContainText(`第 ${newest?.n} 站`);
  await expect(trigger).toContainText(newest?.station ?? "");
  await trigger.click();
  const optionNames = page.getByTestId("station-search").getByRole("option").locator("[data-slot=combobox-item-text]");
  await expect(optionNames).toHaveCount(publishedShanghai.length);
  expect((await optionNames.allInnerTexts()).map((name) => name.replace(/NEW/g, "").trim())).toEqual(shanghai.map((station) => station.station));

  const index = buildSearchIndex(getShanghaiFoodStations());
  const input = page.getByTestId("station-search").getByRole("combobox");
  await input.fill("麵");
  const shown = page.locator("[data-slot=combobox-item]:not([hidden]) [data-slot=combobox-item-text]");
  const shownNames = (await shown.allInnerTexts()).map((name) => name.replace(/NEW/g, "").trim());
  expect(new Set(shownNames)).toEqual(new Set(filterStations(index, { query: "麵" }).map((station) => station.station)));

  await input.fill("");
  await page.getByRole("button", { name: "只看這條線" }).click();
  await page.getByRole("menuitemradio", { name: "1 號線", exact: true }).click();
  const lined = filterStations(index, { line: "1 號線" }).map((station) => station.station);
  await expect(page.getByTestId("station-search").getByRole("option")).toHaveCount(lined.length);
  const linedNames = (await page.getByTestId("station-search").getByRole("option").locator("[data-slot=combobox-item-text]").allInnerTexts()).map((name) => name.replace(/NEW/g, "").trim());
  expect(new Set(linedNames)).toEqual(new Set(lined));
  expect(linedNames).not.toContain("人民廣場");
});

test.describe("shanghai no-JS station list", () => {
  test.use({ javaScriptEnabled: false });

  test("lists the published stations as links and omits 人民廣場", async ({ page }) => {
    expect(publishedShanghai.length).toBeGreaterThanOrEqual(5);
    expect(stationIdentity(shanghai), "published Shanghai stations").toEqual(stationIdentity(publishedShanghai));
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/shanghai");
    const links = page.getByTestId("station-fallback").locator("a");
    await expect(links).toHaveCount(publishedShanghai.length);
    expect(await links.allInnerTexts()).toEqual(shanghai.map((station) => station.station));
    for (const station of shanghai) {
      await expect(links.filter({ hasText: station.station })).toHaveAttribute("href", `#${station.slug}`);
    }
    expect(await page.content()).not.toContain("人民廣場");
  });
});

test("a 45-station fixture keeps the closed control height and the panel cap", async ({ context }) => {
  const closedPage = await context.newPage();
  await closedPage.setViewportSize({ width: 1280, height: 800 });
  await closedPage.goto("/metro");
  await waitForMap(closedPage);
  const closed = (await closedPage.getByTestId("station-search").boundingBox())!;
  await closedPage.close();
  const grownStations = withFixtureCount(taipei, 45);
  const grownLatest = latestStation(grownStations)!;
  const page = await context.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/metro?pickerFixture=45");
  await waitForMap(page);
  const grown = (await page.getByTestId("station-search").boundingBox())!;
  expect(Math.abs(grown.height - closed.height)).toBeLessThanOrEqual(2);
  await expect(page.getByTestId("station-picker-trigger")).toContainText(grownLatest.station);
  await expect.poll(() => page.locator("[data-testid=metro-pin-taipei-101-world-trade-center] .ph").evaluate((el) => el.getBoundingClientRect().height)).toBeGreaterThan(10);
  expect(await boxBottom(page, "[data-testid=metro-pin-taipei-101-world-trade-center] .ph")).toBeLessThanOrEqual(800);
  await page.getByTestId("station-picker-trigger").click();
  await expect(page.getByTestId("station-search").getByRole("option")).toHaveCount(45);
  expect((await page.locator(".sd-sheet").boundingBox())!.height).toBeLessThanOrEqual(300);
  await page.close();
});
