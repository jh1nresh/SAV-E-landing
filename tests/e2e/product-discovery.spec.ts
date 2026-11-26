import { expect, test } from "@playwright/test";

const title = "Savvy 美食地圖收藏 App｜把想去的地方存成地圖";

test("homepage HTML and Markdown identify the same app and verified brand profiles", async ({ request }) => {
  const response = await request.get("/");
  expect(response.ok()).toBe(true);
  const html = await response.text();
  expect(html).toContain(`<title>${title}</title>`);
  expect(html).toContain(`property="og:title" content="${title}"`);
  const json = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
  expect(json).toBeTruthy();
  const graph = JSON.parse(json!)["@graph"];
  const app = graph.find((node: { "@type": string }) => node["@type"] === "SoftwareApplication");
  const organization = graph.find((node: { "@type": string }) => node["@type"] === "Organization");
  expect(app).toMatchObject({ name: "Savvy", operatingSystem: "iOS", applicationCategory: "TravelApplication", publisher: { "@id": organization["@id"] } });
  expect(app.description).toContain("美食地圖收藏 App");
  expect(app).not.toHaveProperty("aggregateRating");
  expect(app).not.toHaveProperty("offers");
  for (const profile of organization.sameAs) expect(html).toContain(`href="${profile}"`);
  expect(organization.sameAs).toHaveLength(5);
  const markdown = await (await request.get("/index.md")).text();
  expect(markdown).toContain("# Savvy 美食地圖收藏 App");
  expect(markdown).toContain("確認地點");
});

test("workspace rendering keeps the product title and visible app label", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('我的行程');
  await expect(page).toHaveTitle(title);
  await page.goto('/#app');
  await expect(page.locator('.app-intro-brand')).toHaveText('Savvy 美食地圖收藏 App');
  await expect(page).toHaveTitle(title);
});
