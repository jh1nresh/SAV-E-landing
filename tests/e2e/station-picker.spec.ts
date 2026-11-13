import { expect, test } from "@playwright/test";
import { getFoodStations, getPublicMetroData, getShanghaiFoodStations } from "../../lib/metro";
import { buildPickerStations, compareNewest, latestStation, TAIPEI_LINE_COLOR, withFixtureCount } from "../../lib/station-picker.mjs";
import { waitForCardOpen, waitForMap } from "./helpers";

const taipei = buildPickerStations(getFoodStations(), getPublicMetroData().stations, TAIPEI_LINE_COLOR).sort(compareNewest);
const shanghai = buildPickerStations(getShanghaiFoodStations(), []).sort(compareNewest);
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
  await page.goto("/");
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
  await page.goto("/");
  await waitForMap(page);
  for (const station of [oldest, middle, newest]) {
    await page.getByTestId("station-picker-trigger").click();
    await page.getByTestId(`station-option-${station.selectId}`).click();
    await expect(page.getByTestId("station-picker-trigger")).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByTestId("station-picker-trigger")).toBeFocused();
    await expect(page.getByTestId("station-picker-trigger")).toContainText(station.station);
    await expect(page).toHaveURL(new RegExp(`#${station.slug}$`));
    await expect(page.locator(".pin.picked")).toHaveCount(1);
    await expect(page.locator(`[data-testid="metro-pin-${station.selectId}"]`)).toHaveClass(/picked/);
    await waitForCardOpen(page);
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
  await page.goto(`/#${middle.slug}`);
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
  await page.goto("/");
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
  await page.goto("/");
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
  await page.goto("/");
  await waitForMap(page);
  const trigger = page.getByTestId("station-picker-trigger");
  await trigger.click();
  await expect(page.getByText("找一站", { exact: true }).last()).toBeVisible();
  const backdrop = page.locator(".sd-backdrop");
  await expect(backdrop).toBeVisible();
  const option = page.getByRole("option").first();
  expect((await option.boundingBox())!.height).toBeGreaterThanOrEqual(48);
  await backdrop.click({ position: { x: 20, y: 20 } });
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(trigger).toBeFocused();
});

test.describe("no-JS station list", () => {
  test.use({ javaScriptEnabled: false });

  test("lists every station as a link and does not print a weekly count", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
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
  test(`App Store stays on the first screen at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await waitForMap(page);
    const bottom = await boxBottom(page, "[data-testid=hero-appstore]");
    expect(bottom).toBeLessThanOrEqual(height);
    const top = await page.getByTestId("hero-appstore").evaluate((el) => el.getBoundingClientRect().top);
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
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await waitForMap(page);
  const pins = page.locator("[data-testid^=metro-pin-]");
  await expect(pins).toHaveCount(taipei.length);
  for (const pin of await pins.all()) {
    const id = (await pin.getAttribute("data-testid")) ?? "metro-pin";
    await expect.poll(() => pin.locator(".ph").evaluate((el) => el.getBoundingClientRect().height)).toBeGreaterThan(10);
    const box = await pin.locator(".ph").evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom };
    });
    expect(box.top, id).toBeGreaterThanOrEqual(0);
    expect(box.bottom, id).toBeLessThanOrEqual(800);
  }
  const labels = await page.evaluate(() => [...document.querySelectorAll("#stdots text")].map((el) => {
    const rect = el.getBoundingClientRect();
    return { name: el.textContent ?? "", top: rect.top, bottom: rect.bottom };
  }));
  expect(labels).toHaveLength(taipei.length);
  for (const label of labels) {
    expect(label.top, label.name).toBeGreaterThanOrEqual(0);
    expect(label.bottom, label.name).toBeLessThanOrEqual(800);
  }
  // 101 was ~121px below the fold, and 象山 ~139px, when six date-tab rows sat under the map.
  for (const name of ["台北101", "象山"]) {
    expect(labels.some((label) => label.name.includes(name)), `${name} is on the map`).toBe(taipei.some((station) => station.station.includes(name)));
    const label = labels.find((item) => item.name.includes(name));
    if (!label) continue;
    expect(label.bottom, name).toBeLessThanOrEqual(800);
  }
});

test("the weekly stamp does not cover 國父紀念館 at 390", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?clock=2026-11-13");
  await waitForMap(page);
  const stamp = (await page.locator("#stamp").boundingBox())!;
  const stampText = (await page.locator("#stampA").textContent()) ?? "";
  const memorialOnMap = taipei.some((station) => station.station.includes("國父紀念館"));
  if (memorialOnMap) expect(stampText).toBe("本週新增 30 家");
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
  if (memorialOnMap) {
    const memorial = await page.evaluate(() => {
      const el = [...document.querySelectorAll("#stdots text")].find((node) => node.textContent?.includes("國父紀念館"));
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    });
    expect(memorial).not.toBeNull();
    expect(intersects(stamp, memorial!)).toBe(false);
  }
});

test("every Shanghai pin is on the first screen at 1280x800", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/shanghai");
  await expect(page.locator("[data-testid^=shanghai-pin-]")).toHaveCount(shanghai.length);
  for (const pin of await page.locator("[data-testid^=shanghai-pin-]").all()) {
    const box = (await pin.boundingBox())!;
    const id = (await pin.getAttribute("data-testid")) ?? "shanghai-pin";
    expect(box.y, id).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height, id).toBeLessThanOrEqual(800);
  }
});

test("a 45-station fixture keeps the closed control height and the panel cap", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await waitForMap(page);
  const closed = (await page.getByTestId("station-search").boundingBox())!;
  const grownStations = withFixtureCount(taipei, 45);
  const grownLatest = latestStation(grownStations)!;
  await page.goto("/?pickerFixture=45");
  await waitForMap(page);
  const grown = (await page.getByTestId("station-search").boundingBox())!;
  expect(Math.abs(grown.height - closed.height)).toBeLessThanOrEqual(2);
  await expect(page.getByTestId("station-picker-trigger")).toContainText(grownLatest.station);
  await expect.poll(() => page.locator("[data-testid=metro-pin-taipei-101-world-trade-center] .ph").evaluate((el) => el.getBoundingClientRect().height)).toBeGreaterThan(10);
  expect(await boxBottom(page, "[data-testid=metro-pin-taipei-101-world-trade-center] .ph")).toBeLessThanOrEqual(800);
  await page.getByTestId("station-picker-trigger").click();
  await expect(page.getByRole("option")).toHaveCount(45);
  expect((await page.locator(".sd-sheet").boundingBox())!.height).toBeLessThanOrEqual(300);
});
