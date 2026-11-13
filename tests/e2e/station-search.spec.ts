import { expect, test, type Page } from "@playwright/test";
import { waitForCardOpen } from "./helpers";

const WIDTHS = [390, 1280] as const;

async function search(page: Page) {
  const input = page.getByRole("combobox");
  await expect(input).toBeVisible();
  await expect.poll(() => input.evaluate((el) => Object.keys(el).some((key) => key.startsWith("__react")))).toBe(true);
  return input;
}

test("search follows the Taipei view and stays off a city-picker homepage", async ({ page }) => {
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.locator("[data-slot=segmented-control]")).toHaveCount(0);
    const cityCard = page.getByTestId("city-card-taipei");
    if (await cityCard.count()) {
      await expect(page.getByRole("heading", { name: "先選城市" })).toBeVisible();
      await expect(page.getByTestId("station-search")).toHaveCount(0);
      await expect(page.getByRole("combobox")).toHaveCount(0);
      await expect(page.getByText("全部路線")).toHaveCount(0);
    } else {
      const input = await search(page);
      await expect(page.getByRole("button", { name: "只看這條線" })).toHaveCount(0);
      await input.fill("豫園");
      await expect(page.getByTestId("station-search-empty")).toHaveText("這個篩選下沒有符合的站，換個字試試。");
      await input.fill("小巨蛋");
      await expect(page.locator("[data-slot=combobox-item]:not([hidden])")).toContainText("小巨蛋");
    }
  }
});

test("station search is in the server HTML", async ({ request }) => {
  const taipei = await (await request.get("/taipei")).text();
  expect(taipei).toContain("找一站");
  expect(taipei).toContain("搜站名或菜色");
  expect(taipei).not.toContain("全部路線");
  expect(taipei).not.toContain("data-slot=\"segmented-control\"");
  const shanghai = await (await request.get("/shanghai")).text();
  expect(shanghai).toContain("找一站");
  expect(shanghai).toContain("全部路線");
  expect(shanghai).toContain("搜站名或菜色");
  const home = await (await request.get("/")).text();
  expect(home).not.toContain("data-slot=\"segmented-control\"");
  if (home.includes("先選城市")) {
    expect(home).not.toContain("搜站名或菜色");
  } else {
    expect(home).toContain("找一站");
    expect(home).toContain("搜站名或菜色");
    expect(home).not.toContain("全部路線");
  }
});

for (const width of WIDTHS) {
  test(`taipei search keyboard, empty state, and map card at ${width}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page.goto("/taipei");
    const input = await search(page);
    const font = await input.evaluate((el) => getComputedStyle(el).fontFamily);
    expect(font.toLowerCase()).not.toContain("iansui");
    await expect(page.getByRole("button", { name: "只看這條線" })).toHaveCount(0);
    await expect(page.locator("[data-slot=segmented-control]")).toHaveCount(0);

    const searchBox = (await page.getByTestId("station-search").boundingBox())!;
    const sortLabel = (await page.locator(".strip-label", { hasText: "依最新更新排序" }).boundingBox())!;
    if (width < 800) {
      const stickers = (await page.locator(".hero-stk").boundingBox())!;
      const capsules = (await page.locator(".map-stage .strip").filter({ visible: true }).first().boundingBox())!;
      expect(stickers.y + stickers.height).toBeLessThanOrEqual(searchBox.y + 1);
      expect(searchBox.y + searchBox.height).toBeLessThanOrEqual(capsules.y + 1);
    } else {
      const heading = (await page.getByRole("heading", { name: "看到喜歡的存下" }).boundingBox())!;
      expect(searchBox.x).toBeGreaterThan(heading.x + heading.width / 2);
      expect(searchBox.y + searchBox.height).toBeLessThanOrEqual(sortLabel.y + 2);
    }

    const stage = page.locator(".map-stage");
    const mapBefore = (await stage.boundingBox())!;
    await input.fill("麵");
    await expect(input).toHaveAttribute("aria-expanded", "true");
    const mapAfter = (await stage.boundingBox())!;
    expect(Math.abs(mapAfter.y - mapBefore.y)).toBeLessThan(2);

    const name = page.locator("[data-slot=combobox-item][data-highlighted] [data-slot=combobox-item-text]");
    await expect(name).toBeVisible();
    const first = await name.innerText();
    await input.press("ArrowDown");
    await expect(name).not.toHaveText(first);
    await input.press("ArrowUp");
    await expect(name).toHaveText(first);
    const shown = page.locator("[data-slot=combobox-item]:not([hidden])");
    const count = await shown.count();
    expect(count).toBeGreaterThan(4);
    await expect(page.getByTestId("station-search-count")).toHaveText(`${count} 站符合「麵」 · 往下捲看更多`);
    await expect(shown.first()).toContainText("松山新店線");

    await input.fill("沒有這家zzzz");
    const empty = page.getByTestId("station-search-empty");
    await expect(empty).toHaveText("這個篩選下沒有符合的站，換個字試試。");
    await expect(empty).not.toBeEmpty();
    await input.fill("豫園");
    await expect(empty).toHaveText("這個篩選下沒有符合的站，換個字試試。");
    await input.press("Escape");
    await expect(input).toHaveAttribute("aria-expanded", "false");

    await input.fill("小巨蛋");
    await expect(page.locator("[data-slot=combobox-item]:not([hidden])")).toContainText("第 1 站 · 松山新店線");
    await input.press("Enter");
    await waitForCardOpen(page);
    await expect(page.locator("#cardTitle")).toContainText("小巨蛋");
    await expect(page.locator("#card")).toBeInViewport();
    expect(errors.filter((error) => /hydrat|did not match|Minified React error/i.test(error))).toEqual([]);
  });

  test(`shanghai search keyboard, empty state, line menu, and scroll at ${width}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page.goto("/shanghai");
    const input = await search(page);
    const font = await input.evaluate((el) => getComputedStyle(el).fontFamily);
    expect(font.toLowerCase()).not.toContain("iansui");
    await expect(page.locator("[data-slot=segmented-control]")).toHaveCount(0);

    const note = (await page.getByText("價錢是人民幣").boundingBox())!;
    const searchBox = (await page.getByTestId("station-search").boundingBox())!;
    const map = (await page.locator(".sh-mapcard").boundingBox())!;
    expect(note.y).toBeLessThan(searchBox.y);
    expect(searchBox.y + searchBox.height).toBeLessThanOrEqual(map.y + 1);
    const menu = page.getByRole("button", { name: "只看這條線" });
    const menuBox = (await menu.boundingBox())!;
    const inputBox = (await input.boundingBox())!;
    if (width < 800) expect(menuBox.y).toBeGreaterThan(inputBox.y);
    else expect(menuBox.x).toBeGreaterThan(inputBox.x + inputBox.width - 8);

    await menu.click();
    await expect(page.getByRole("menuitemradio", { name: "1 號線", exact: true })).toBeVisible();
    await expect(page.getByRole("menuitemradio", { name: "11 號線", exact: true })).toBeVisible();
    await expect(page.getByRole("menuitemradio", { name: "3 號線", exact: true })).toHaveCount(0);
    await expect(page.getByRole("menuitemradio", { name: "全部路線", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");

    const mapBefore = map.y;
    await input.fill("麵");
    await expect(input).toHaveAttribute("aria-expanded", "true");
    const mapNow = (await page.locator(".sh-mapcard").boundingBox())!;
    expect(Math.abs(mapNow.y - mapBefore)).toBeLessThan(2);
    const name = page.locator("[data-slot=combobox-item][data-highlighted] [data-slot=combobox-item-text]");
    const first = await name.innerText();
    await input.press("ArrowDown");
    await expect(name).not.toHaveText(first);
    await input.press("ArrowUp");
    await expect(name).toHaveText(first);
    await expect(page.getByTestId("station-search-count")).toHaveText("4 站符合「麵」");
    await expect(page.locator("[data-slot=combobox-item]:not([hidden])").filter({ hasText: "黃陂南路" })).toBeVisible();

    await input.fill("沒有這家zzzz");
    await expect(page.getByTestId("station-search-empty")).toHaveText("這個篩選下沒有符合的站，換個字試試。");
    await input.press("Escape");
    await expect(input).toHaveAttribute("aria-expanded", "false");

    await menu.click();
    await page.getByRole("menuitemradio", { name: "1 號線", exact: true }).click();
    await input.fill("麵");
    await expect(page.locator("[data-slot=combobox-item]:not([hidden])")).toHaveCount(1);
    await expect(page.locator("[data-slot=combobox-item]:not([hidden])")).toContainText("黃陂南路");
    await input.fill("");
    await input.press("Escape");
    await page.getByRole("button", { name: "只看這條線" }).click();
    await page.getByRole("menuitemradio", { name: "全部路線", exact: true }).click();

    await input.fill("豫園");
    await input.press("Enter");
    const section = page.locator("#shanghai-yuyuan");
    await expect(section).toBeInViewport();
    await expect(section.locator("h2")).toHaveText("豫園");
    expect(errors.filter((error) => /hydrat|did not match|Minified React error/i.test(error))).toEqual([]);
  });
}

test("reduced motion drops the search popup transition", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/shanghai");
  const input = await search(page);
  await input.fill("麵");
  const popup = page.locator("[data-slot=combobox-content]");
  await expect(popup).toBeVisible();
  const duration = await popup.evaluate((el) => getComputedStyle(el).transitionDuration);
  expect(duration === "0s" || duration === "0s, 0s").toBe(true);
});
