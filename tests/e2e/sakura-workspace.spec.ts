import { expect, test } from "@playwright/test";

test("the workspace is the crawlable homepage and links to the public library", async ({ request }) => {
  const home = await request.get("/", { headers: { Accept: "text/html" } });
  expect(home.ok()).toBe(true);
  expect(home.headers()["cache-control"]).toContain("no-store");
  const html = await home.text();
  expect(html).toContain('<link rel="canonical" href="https://savvy.jeezlabs.io/">');
  expect(html).toContain("<h1>Savvy 美食地圖</h1>");
  for (const path of ["/zh-tw/travel", "/zh-tw/posts", "/discover", "/privacy"]) {
    expect(html).toContain(`href="${path}"`);
  }
  for (const city of ["taipei", "shanghai"]) {
    const oldMapLink = await request.get(`/?city=${city}`, { maxRedirects: 0 });
    expect(oldMapLink.status()).toBe(308);
    expect(oldMapLink.headers().location).toBe(`/discover?city=${city}`);
  }
  const library = await (await request.get("/trips/library.json")).json();
  const posts = library.filter((item: { kind: string }) => item.kind === "post");
  expect(posts.length).toBeGreaterThanOrEqual(45);
  expect(new Set(posts.map((post: { source: string }) => post.source)).size).toBe(posts.length);
  const index = await (await request.get("/zh-tw/posts")).text();
  for (const { source } of posts) {
    expect(source).toMatch(/^https:\/\/www\.threads\.com\/@savvysave_\/post\/[A-Za-z0-9_-]+$/);
    expect(index).toContain(`href="${source}"`);
  }
});

test("home opens collections and Atlas, and Shanghai links to the Lan Xin guide", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const main = page.locator("#workspace");
  await expect(page.locator(".workspace-tabs .seams span")).toHaveCount(5);

  await expect(main.getByRole("heading", { name: "我的行程", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "收藏", exact: true }).click();
  await expect(main.getByRole("heading", { name: "攻略與原文" })).toBeVisible();
  await main.getByRole("combobox", { name: "依內容類型篩選" }).selectOption("post");
  await expect(main.locator('.col-ws-publications a[href^="https://www.threads.com/"]').first()).toBeVisible();
  await page.getByRole("link", { name: "城市圖鑑", exact: true }).click();
  await expect(main.locator(".atlas-ws-stat strong")).toHaveText("0 / 9");
  await main.getByRole("button", { name: "我去過上海" }).click();
  await expect(main.locator(".atlas-ws-stat strong")).toHaveText("1 / 9");
  await page.getByRole("link", { name: "遊記", exact: true }).click();
  await expect(main.getByRole("heading", { name: "遊記", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "我的行程", exact: true }).click();
  await main.locator('a[href^="#trip/shanghai-walk"]').first().click();
  await main.getByRole("link", { name: "蘭心", exact: true }).press("Enter");
  await expect(page).toHaveURL(/#guide\/shanghai.*stop=lan-xin/);
  await expect(main.getByRole("link", { name: /完整原文/ })).toHaveAttribute("href", "/zh-tw/travel/shanghai-benbang");
});

test("Sakuga signup buttons close, validate and confirm using the existing API", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  let requests = 0;
  await page.route("**/api/test-list", async route => {
    requests++;
    expect(route.request().method()).toBe("POST");
    expect(route.request().postDataJSON()).toEqual({ email: "savvy-test@example.com" });
    await route.fulfill({ json: { state: "confirmed" } });
  });

  await page.goto("/");
  const launcher = page.locator(".appbar").getByRole("button", { name: "加入測試名單" });
  await launcher.click();
  const dialog = page.getByRole("dialog");
  const close = dialog.locator('sakuga-button[variant="secondary"]');
  const submit = dialog.locator('sakuga-button[variant="primary"]');
  await expect(close.getByRole("button", { name: "關閉" })).toBeVisible();
  await close.getByRole("button").focus();
  await page.keyboard.press("Enter");
  await expect(dialog).toBeHidden();
  await launcher.click();
  const email = dialog.getByRole("textbox", { name: "Email" });
  await email.fill("invalid");
  await submit.getByRole("button").click();
  expect(requests).toBe(0);
  await email.fill("savvy-test@example.com");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await submit.getByRole("button").click();
  await expect(dialog.getByRole("status")).toContainText("已收到報名");
  await expect(email).toBeEmpty();
  await expect.poll(() => submit.evaluate(el => Number((el.shadowRoot?.querySelector("button") as HTMLElement).style.getPropertyValue("--ok")))).toBeGreaterThan(0.3);
  expect(requests).toBe(1);
  await email.fill("savvy-test@example.com");
  await email.press("Enter");
  await expect.poll(() => requests).toBe(2);
});
