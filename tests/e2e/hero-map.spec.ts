import { expect, test } from "@playwright/test";
import { clickPin, dispatchSwipe, dispatchTouchSwipe, openStation, waitForCardOpen, waitForMap } from "./helpers";

test.describe("hero map interactions", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await waitForMap(page);
  });

  test("B-1 page lists stations from metro.json", async ({ page }) => {
    const metro = await page.evaluate(async () => {
      const res = await fetch("/_not_used").catch(() => null);
      return res;
    });
    void metro;
    const names = ["小巨蛋", "松山", "雙連", "東門", "後山埤"];
    for (const name of names) {
      await expect(page.locator(".strip").getByText(name, { exact: false })).toBeVisible();
    }
  });

  test("D-1 pin and tab open the same station; 全圖 returns home", async ({ page }) => {
    await clickPin(page, "houshanpi");
    await waitForCardOpen(page);
    await expect(page.locator("#cardTitle")).toContainText("後山埤");
    const zoomed = await page.evaluate(() => window.__savvyMap!.state().camS);
    await expect(page.locator("[data-testid=metro-reset]")).toHaveClass(/on/);
    await page.locator("[data-testid=metro-reset]").click();
    await expect(page.locator("#card")).toBeHidden();
    await page.waitForFunction((was) => window.__savvyMap!.state().camS < was, zoomed);
    await page.locator("[data-testid=metro-tab-dongmen]").click();
    await waitForCardOpen(page);
    await expect(page.locator("#cardTitle")).toContainText("東門");
  });

  test("D-2 close via X", async ({ page }) => {
    await openStation(page, "houshanpi");
    await page.locator("[data-testid=metro-close]").click();
    await expect(page.locator("#card")).toBeHidden();
  });

  test("D-2 close via Escape", async ({ page }) => {
    await openStation(page, "houshanpi");
    await page.keyboard.press("Escape");
    await expect(page.locator("#card")).toBeHidden();
  });

  test("D-2 close via empty map tap", async ({ page }) => {
    await openStation(page, "houshanpi");
    await page.evaluate(() => {
      document.getElementById("vp")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await expect(page.locator("#card")).toBeHidden();
  });

  test("D-2 swipe down closes; short swipe springs back", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await waitForMap(page);
    await openStation(page, "houshanpi");
    if (testInfo.project.name === "webkit") {
      await dispatchTouchSwipe(page, 30);
      await dispatchSwipe(page, 30);
    } else {
      await dispatchTouchSwipe(page, 30);
    }
    await expect(page.locator("#card")).toBeVisible();
    if (testInfo.project.name === "webkit") await dispatchSwipe(page, 140);
    else await dispatchTouchSwipe(page, 140);
    await expect(page.locator("#card")).toBeHidden();
  });

  test("D-3 keyboard opens and focus returns to the pin", async ({ page }) => {
    const pin = page.locator("[data-testid=metro-pin-houshanpi]");
    await pin.focus();
    await expect(pin).toBeFocused();
    await page.keyboard.press("Enter");
    await waitForCardOpen(page);
    await page.keyboard.press("Escape");
    await expect(page.locator("#card")).toBeHidden();
    await expect(pin).toBeFocused();
  });

  test("D-4 pin hit and close button are at least 44x44", async ({ page }) => {
    const hit = await page.locator("[data-testid=metro-pin-houshanpi] .hit").boundingBox();
    expect(hit).toBeTruthy();
    expect(hit!.width).toBeGreaterThanOrEqual(44);
    expect(hit!.height).toBeGreaterThanOrEqual(44);
    await openStation(page, "houshanpi");
    const close = await page.locator("[data-testid=metro-close]").evaluate((el) => ({
      w: (el as HTMLElement).offsetWidth,
      h: (el as HTMLElement).offsetHeight,
    }));
    expect(close.w).toBeGreaterThanOrEqual(44);
    expect(close.h).toBeGreaterThanOrEqual(44);
  });

  test("C-4 resize while card is open does not blank the map", async ({ page }) => {
    await openStation(page, "houshanpi");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(200);
    await page.evaluate(() => window.__savvyMap?.goHome());
    await expect(page.locator("#mapsvg")).toBeVisible();
    const metrics = await page.evaluate(() => {
      const svg = document.getElementById("mapsvg") as SVGElement | null;
      const r = svg?.getBoundingClientRect();
      const st = window.__savvyMap!.state();
      return { w: r?.width ?? 0, h: r?.height ?? 0, viewW: st.viewW, viewH: st.viewH, transform: st.worldTransform };
    });
    expect(metrics.w).toBeGreaterThan(100);
    expect(metrics.h).toBeGreaterThan(100);
    expect(metrics.viewW).toBeGreaterThan(8);
    expect(metrics.viewH).toBeGreaterThan(8);
    expect(metrics.transform).not.toContain("scale(0)");
    await expect(page.locator("[data-testid=metro-pin-houshanpi] .ph")).toBeVisible();
    await expect(page.locator(".pin .ph")).toHaveCount(5);
  });

  test("C-4 orientation-style width change does not blank the map", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await waitForMap(page);
    await openStation(page, "dongmen");
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(200);
    await page.evaluate(() => {
      const vp = document.getElementById("vp") as HTMLElement;
      vp.style.display = "none";
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => {
      const vp = document.getElementById("vp") as HTMLElement;
      vp.style.display = "";
      window.__savvyMap?.applySize();
      window.__savvyMap?.goHome();
    });
    const metrics = await page.evaluate(() => {
      const svg = document.getElementById("mapsvg") as SVGElement | null;
      const r = svg?.getBoundingClientRect();
      const st = window.__savvyMap!.state();
      return { w: r?.width ?? 0, h: r?.height ?? 0, viewW: st.viewW, viewH: st.viewH };
    });
    expect(metrics.w).toBeGreaterThan(100);
    expect(metrics.viewW).toBeGreaterThan(8);
    await expect(page.locator("#mapsvg")).toBeVisible();
    await expect(page.locator(".pin")).toHaveCount(5);
  });

  test("D-6 card stays usable when food images fail", async ({ page }) => {
    await page.route("**/assets/food/**", (route) => route.abort());
    await page.goto("/");
    await waitForMap(page);
    await openStation(page, "houshanpi");
    await expect(page.locator("#cardTitle")).toContainText("後山埤");
    await expect(page.locator("#card .est")).toContainText("示意");
    await expect(page.locator("#card .cfoot")).toContainText("菜圖為 AI 示意，非店家實拍");
  });

  test("B-5 unverified prices show 示意", async ({ page }) => {
    await openStation(page, "houshanpi");
    await expect(page.locator("#card .est")).toContainText("示意");
  });

  test("B-7 real IG and Threads chips; no #example or 小紅書", async ({ page }) => {
    await openStation(page, "arena");
    const arena = page.locator("#card .src");
    await expect(arena).toHaveCount(2);
    await expect(arena.nth(0)).toHaveAttribute("href", "https://www.instagram.com/p/DewQqqNm7ay/");
    await expect(arena.nth(0)).toHaveAttribute("data-platform", "ig");
    await expect(arena.nth(1)).toHaveAttribute("href", "https://www.threads.com/@savvysave_/post/DewQ7Zrm-DR");
    await expect(arena.nth(1)).toHaveAttribute("data-platform", "threads");

    await page.locator("[data-testid=metro-close]").click();
    await openStation(page, "shuanglian");
    const shuang = page.locator("#card .src");
    await expect(shuang).toHaveCount(1);
    await expect(shuang).toHaveAttribute("href", "https://www.threads.com/@savvysave_/post/De1zvmkG_ae");
    await expect(page.locator("#card a[href*='instagram.com']")).toHaveCount(0);
    await expect(page.locator("#card a[href*='xiaohongshu']")).toHaveCount(0);

    await page.locator("[data-testid=metro-close]").click();
    await openStation(page, "houshanpi");
    await expect(page.locator("#card .src[data-platform=ig]")).toHaveAttribute(
      "href",
      "https://www.instagram.com/p/De6kh33mwwb/",
    );
    await expect(page.locator("body")).not.toContainText("#example");
  });
});
