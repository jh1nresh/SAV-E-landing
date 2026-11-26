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
    for (const path of [...paths, "/zh-tw/travel/paris-eiffel-tower-tickets", "/zh-tw/posts/DgKYy3EDGw0", "/zh-tw/guides/instagram-restaurants-to-map", "/metro/xiaojudan"]) {
      const page = await context.newPage();
      const response = await page.goto(path);
      expect(response?.ok(), path).toBe(true);
      await expect(page.locator("main h1:visible"), path).toHaveCount(1);
      await expect(page.locator("nav.top .brand img")).toHaveAttribute("src", "/icon.png");
      await expect(page.locator('nav.top a[href="/#collection"]')).toBeVisible();
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
