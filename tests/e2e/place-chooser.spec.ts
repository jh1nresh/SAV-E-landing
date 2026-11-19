import { expect, test, type Page } from "@playwright/test";

const SHANGHAI_STATION = "shanghai-jingan-temple";
const TAIPEI_SHOP = "黑殿飯店 右岸店";
const SAVED_SHOP = "文化阿給";

const result = (page: Page) => page.getByTestId("choose-result");
const shop = (page: Page) => result(page).locator(".choose-shop");
const city = (page: Page, name: "taipei" | "shanghai") => page.getByTestId(`city-switch-${name}`);

async function expectLocation(page: Page, name: "taipei" | "shanghai", station: string) {
  await expect(city(page, name)).toHaveAttribute("aria-current", "true");
  await expect(result(page)).toHaveAttribute("data-place", station);
  await expect(page.locator(".hero-search-col")).toHaveAttribute("data-city", name);
}

test("changing city drops stale chooser state and survives a reload", async ({ page }) => {
  await page.goto(`/?lang=en&city=shanghai&place=${SHANGHAI_STATION}&food=noodle&shop=dusche`);
  await expectLocation(page, "shanghai", SHANGHAI_STATION);
  await city(page, "taipei").click();
  await expectLocation(page, "taipei", "tamsui");
  await expect(page).toHaveURL(/\/\?lang=en$/);
  await page.reload();
  await expectLocation(page, "taipei", "tamsui");
  await expect(result(page)).toHaveAttribute("data-food", "any");
  await expect(shop(page)).toHaveText(TAIPEI_SHOP);
});

test("cross-city Back and Forward restore the selected station without adding entries", async ({ page }) => {
  await page.goto("/?place=tamsui&food=rice");
  await expect(result(page)).toHaveAttribute("data-food", "rice");
  const initialLength = await page.evaluate(() => history.length);
  await city(page, "shanghai").click();
  await result(page).getByRole("button", { name: /選車站/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: /靜安寺/ }).click();
  await expectLocation(page, "shanghai", SHANGHAI_STATION);
  await page.goBack();
  await expectLocation(page, "taipei", "tamsui");
  await expect(result(page)).toHaveAttribute("data-food", "rice");
  await page.goForward();
  await expectLocation(page, "shanghai", SHANGHAI_STATION);
  await expect(result(page)).toHaveAttribute("data-food", "any");
  expect(await page.evaluate(() => history.length)).toBe(initialLength + 1);
});

test("a shared link preserves a non-first restaurant and rejects an unrelated shop key", async ({ page, context }) => {
  await page.goto("/?place=tamsui");
  await shop(page).waitFor();
  await result(page).getByRole("button", { name: SAVED_SHOP, exact: true }).click();
  await expect(shop(page)).toHaveText(SAVED_SHOP);
  const link = await page.getByTestId("choose-preview-link").getAttribute("href");
  expect(link).toBe("/?place=tamsui&shop=wenhua");
  const recipient = await context.newPage();
  await recipient.goto(link!);
  await expect(shop(recipient)).toHaveText(SAVED_SHOP);
  await recipient.goto("/?place=tamsui&food=rice&shop=wenhua");
  await expect(result(recipient)).toHaveAttribute("data-food", "rice");
  await expect(shop(recipient)).toHaveText(TAIPEI_SHOP);
  await recipient.goto(`/?city=shanghai&place=${SHANGHAI_STATION}&food=soup&shop=dongji`);
  await expectLocation(recipient, "shanghai", SHANGHAI_STATION);
  await expect(result(recipient)).toHaveAttribute("data-food", "any");
  await expect(shop(recipient)).toHaveText("毒蛇麵館（靜安寺店）");
});

test("a legacy Shanghai link loads directly without writing a new history entry", async ({ page }) => {
  await page.goto("/");
  const initialLength = await page.evaluate(() => history.length);
  await page.goto(`/?place=${SHANGHAI_STATION}`);
  await expectLocation(page, "shanghai", SHANGHAI_STATION);
  await expect(page).toHaveURL(new RegExp(`/\\?place=${SHANGHAI_STATION}$`));
  expect(await page.evaluate(() => history.length)).toBe(initialLength + 1);
});

test("two open tabs keep independent changes and can still read the existing shortlist", async ({ page, context }) => {
  await page.goto("/?place=tamsui");
  await page.evaluate(() => localStorage.setItem("savvy.browserShortlist", JSON.stringify([{ slug: "tamsui", key: "heidian" }])));
  await page.reload();
  const second = await context.newPage();
  await second.goto("/?place=tamsui&shop=wenhua");
  await expect(shop(second)).toHaveText(SAVED_SHOP);
  await expect(second.locator(".choose-saved").getByRole("button", { name: TAIPEI_SHOP })).toBeVisible();
  await expect(page.getByTestId("choose-keep")).toHaveAttribute("aria-pressed", "true");

  const otherShop = "老店淡水魚丸阿給";
  await result(page).getByRole("button", { name: otherShop, exact: true }).click();
  await expect(shop(page)).toHaveText(otherShop);
  await Promise.all([page.getByTestId("choose-keep").click(), second.getByTestId("choose-keep").click()]);
  for (const tab of [page, second]) {
    await expect(tab.locator(".choose-saved").getByRole("button")).toHaveCount(3);
  }
  await second.getByTestId("choose-keep").click();
  await expect(page.locator(".choose-saved").getByRole("button", { name: SAVED_SHOP, exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".choose-saved").getByRole("button")).toHaveCount(2);
});

test("the chooser shows soup from a compound dish and hides unsourced prices", async ({ page }) => {
  await page.goto("/?place=tamsui&food=soup");
  await expect(result(page)).toHaveAttribute("data-food", "soup");
  await expect(shop(page)).toHaveText(SAVED_SHOP);
  await page.goto("/?place=raohe-songshan");
  await result(page).getByRole("button", { name: "安師傅冰火菠蘿", exact: true }).click();
  await expect(shop(page)).toHaveText("安師傅冰火菠蘿");
  await expect(result(page).locator(".choose-price")).toHaveCount(0);
  await page.goto("/?place=tamsui&food=rice");
  await expect(result(page).locator(".choose-price")).toBeVisible();
});

test("station dialog keeps interior padding open and supports backdrop and keyboard dismissal", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const trigger = result(page).getByRole("button", { name: /選車站/ });
  const dialog = page.getByRole("dialog");
  await trigger.click();
  await expect(dialog).toBeVisible();
  const bounds = (await dialog.boundingBox())!;
  await page.mouse.click(bounds.x + 12, bounds.y + 12);
  await expect(dialog).toBeVisible();
  await page.mouse.click(2, 2);
  await expect(dialog).toBeHidden();
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("the chooser reports a rejected storage write without confirming a save", async ({ page }) => {
  await page.addInitScript(() => {
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "savvy.browserShortlist") throw new DOMException("Storage unavailable", "QuotaExceededError");
      setItem.call(this, key, value);
    };
  });
  await page.goto("/?place=tamsui");
  const keep = page.getByTestId("choose-keep");
  await keep.click();
  await expect(page.getByText("無法更新暫存，請確認瀏覽器允許網站儲存。")).toBeVisible();
  await expect(keep).toHaveAttribute("aria-pressed", "false");
});
