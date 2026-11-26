import { expect, test } from "@playwright/test";

test("all six homepage resources use the Sakura reading layout, including article pages", async ({ browser }, testInfo) => {
  const context = await browser.newContext({
    baseURL: testInfo.project.use.baseURL,
    viewport: { width: 320, height: 780 },
    javaScriptEnabled: false,
  });
  try {
    const paths = ["/zh-tw/travel", "/zh-tw/posts", "/zh-tw/guides", "/metro", "/privacy", "/support"];
    const home = await context.newPage();
    await home.goto("/");
    for (const path of paths) await expect(home.locator(`.shell-resources a[href="${path}"]`)).toBeVisible();
    for (const path of [...paths.filter(path => path !== "/metro"), "/zh-tw/travel/paris-eiffel-tower-tickets", "/zh-tw/posts/DgKYy3EDGw0", "/zh-tw/guides/instagram-restaurants-to-map", "/metro/xiaojudan", "/metro/shuanglian", "/about", "/contact", "/docs"]) {
      const page = await context.newPage();
      const response = await page.goto(path);
      expect(response?.ok(), path).toBe(true);
      await expect(page.locator("main h1:visible"), path).toHaveCount(1);
      await expect(page.locator("nav.top .brand img")).toHaveAttribute("src", "/icon.png");
      const menu = page.locator("nav.top .mobile-nav");
      const collection = menu.getByRole("link", { name: "收藏", exact: true });
      await expect(page.locator("nav.top .editorial-tabs")).toBeHidden();
      await expect(collection).toBeHidden();
      await menu.locator("summary").press("Enter");
      await expect(collection).toHaveAttribute("href", "/#collection");
      await expect(collection).toBeVisible();
      await menu.locator("summary").press("Enter");
      await expect(collection).toBeHidden();
      await expect(page.locator("body"), path).toHaveCSS("background-color", "rgb(255, 255, 255)");
      await expect(page.locator("main :is(.guide-header,h1.h):visible").first(), path).toHaveCSS("background-color", "rgb(238, 235, 255)");
      expect(await page.evaluate(() => document.documentElement.scrollWidth), path).toBeLessThanOrEqual(320);
      if (path === "/zh-tw/travel/paris-eiffel-tower-tickets") {
        const table = page.locator(".guide-table-scroll").first();
        await expect(table.getByRole("table")).toBeVisible();
        await table.focus();
        await expect(table).toBeFocused();
        expect(await table.evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true);
      }
      await page.close();
    }
  } finally {
    await context.close();
  }
});

test("Sakura dark mode carries between the workspace and travel guides", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/zh-tw/travel");
  await page.getByRole("switch", { name: "深色模式" }).click();
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(24, 20, 36)");
  await page.locator('nav.top a[href="/"]').click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator(".theme-switch").getByRole("switch")).toHaveAttribute("aria-checked", "true");
});

test("both city map pages keep Sakura controls and dark mode on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 780 });
  for (const path of ["/metro", "/shanghai"]) {
    await page.goto(path);
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(page.getByTestId("city-switch")).toBeVisible();
    await expect(page.locator("nav.top .mobile-nav")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth), path).toBeLessThanOrEqual(320);
  }
  await page.goto("/zh-tw/travel");
  await page.getByRole("switch", { name: "深色模式" }).click();
  await page.goto("/shanghai");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(24, 20, 36)");
  await page.goto("/trips/pocket-city/Taipei/index.html", { waitUntil: "domcontentloaded" });
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(24, 20, 36)");
  await expect(page.locator(".top")).toHaveCSS("background-color", "rgb(37, 31, 54)");
  await expect(page.locator(".tools")).toHaveCSS("background-color", "rgb(37, 31, 54)");
  await expect(page.locator(".tools .tool").last()).toHaveCSS("color", "rgb(246, 239, 255)");
});

test("Sakuga effects enhance native controls and respect reduced motion", async ({ page }) => {
  await page.goto("/metro/shuanglian");
  const source = page.locator("#shop-atian summary");
  await source.press("Enter");
  await expect(page.locator("#shop-atian details")).toHaveAttribute("open", "");
  const canvas = page.locator("canvas.sakuga-fx");
  await expect(canvas).toHaveCount(1);
  await expect(canvas).toHaveCSS("pointer-events", "none");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await source.press("Enter");
  await expect(page.locator("#shop-atian details")).toHaveAttribute("open", "");
  await expect(canvas).toHaveCount(0);
});

test("Sakura styles the credits and the missing-page screen", async ({ page }) => {
  await page.goto("/trips/savvy-media-credits.html");
  await expect(page.locator("h1")).toHaveCSS("background-color", "rgb(238, 235, 255)");
  const missing = await page.goto("/not-a-savvy-page");
  expect(missing?.status()).toBe(404);
  await expect(page.locator("h1")).toHaveText("找不到這個頁面");
  await expect(page.getByRole("link", { name: /回到 Savvy 首頁/ })).toHaveAttribute("href", "/");
});

test("Chinese and English editorial tabs keep the same dimensions without clipping", async ({ page }) => {
  const tabs = page.locator("nav.top .editorial-tabs");
  const dimensions = () => tabs.evaluate(el => {
    const { width, height } = el.getBoundingClientRect();
    return { width, height, cells: [...el.querySelectorAll("a")].map(link => {
      const bounds = link.getBoundingClientRect();
      const label = document.createRange();
      label.selectNodeContents(link);
      const text = label.getBoundingClientRect();
      return {
        width: bounds.width,
        height: bounds.height,
        fits: text.left >= bounds.left && text.right <= bounds.right,
      };
    }) };
  });
  await page.goto("/zh-tw/posts");
  for (const width of [801, 1024, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    await page.getByRole("button", { name: "中文", exact: true }).click();
    await expect(tabs.getByRole("link", { name: "收藏", exact: true })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const chinese = await dimensions();
    expect(chinese.cells).toHaveLength(5);
    expect(chinese.cells.every(cell => cell.fits)).toBe(true);
    await page.getByRole("button", { name: "EN", exact: true }).click();
    await expect(tabs.getByRole("link", { name: "Collections", exact: true })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    expect(await dimensions()).toEqual(chinese);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
});
