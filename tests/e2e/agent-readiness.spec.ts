import { expect, test } from "@playwright/test";

const origin = "https://savvy.jeezlabs.io";
const markdown = { Accept: "text/markdown" };

test("homepage negotiates real representations, quality values, HEAD and 406", async ({ request }) => {
  for (const [accept, type, status] of [
    ["text/markdown", "text/markdown", 200],
    ["text/html", "text/html", 200],
    ["text/markdown;q=0.2,text/html;q=0.9", "text/html", 200],
    ["text/html;q=0.1,text/markdown;q=0.9", "text/markdown", 200],
    ["text/markdown;q=0,*/*;q=1", "text/html", 200],
    ["application/json", "text/plain", 406],
    ["text/html;q=0,text/markdown;q=0", "text/plain", 406],
  ] as const) {
    const response = await request.get("/", { headers: { Accept: accept } });
    expect(response.status(), accept).toBe(status);
    expect(response.headers()["content-type"], accept).toContain(type);
    if (type !== "text/html") expect(response.headers().vary.toLowerCase().split(/,\s*/), accept).toContain("accept");
    expect(response.headers()["cache-control"], accept).toContain("no-store");
    const body = await response.text();
    if (type === "text/markdown") { expect(body).toMatch(/^# Savvy/); expect(body).not.toContain("<!DOCTYPE"); }
    if (type === "text/html") expect(body).toMatch(/<!DOCTYPE html>/i);
  }
  const head = await request.head("/", { headers: markdown });
  expect(head.status()).toBe(200);
  expect(head.headers()["content-type"]).toContain("text/markdown");
  expect(await head.text()).toBe("");
});

test("missing pages preserve 404 and give agents recovery links without reflecting input", async ({ request }) => {
  for (const path of ["/__ora-missing-page", "/__ora-missing.html", "/__ora-missing.json", "/__ora-missing.txt", "/zh-tw/guides/not-a-guide", "/metro/not-a-station", "/p/private-fixture", "/about/extra", "/missing.md"]) {
    const response = await request.get(path, { headers: markdown });
    expect(response.status(), path).toBe(404);
    expect(response.headers()["content-type"]).toContain("text/markdown");
    expect(response.headers().vary).toMatch(/Accept/i);
    const body = await response.text();
    expect(body.length).toBeGreaterThan(20);
    expect(body).toContain(`${origin}/llms.txt`);
    expect(body).toContain(`${origin}/sitemap.xml`);
    expect(body).not.toContain("private-fixture");
  }
  const html = await request.get("/__ora-missing-page", { headers: { Accept: "text/html" } });
  expect(html.status()).toBe(404);
  expect(html.headers()["content-type"]).toContain("text/html");
});

test("every public sitemap page has raw HTML, canonical identity and matching Markdown", async ({ request }) => {
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  expect(sitemap.headers()["content-type"]).toMatch(/xml/);
  const urls = [...(await sitemap.text()).matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
  for (const path of ["/", "/about", "/contact", "/privacy", "/support", "/docs", "/metro", "/zh-tw/guides"]) expect(urls).toContain(origin + path);
  for (const url of urls) {
    expect(url).toMatch(/^https:\/\/savvy\.jeezlabs\.io\//);
    const path = new URL(url).pathname;
    const html = await request.get(path, { headers: { Accept: "text/html" } });
    expect(html.status(), path).toBe(200);
    const body = await html.text();
    const canonical = body.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    expect(canonical ? new URL(canonical).href : null, path).toBe(new URL(url).href);
    expect(body, path).toMatch(/<h1\b/);
    expect(body, path).not.toContain("sav-e-landing.vercel.app");
    const md = await request.get(path, { headers: markdown });
    expect(md.status(), path).toBe(200);
    expect(md.headers()["content-type"], path).toContain("text/markdown");
    expect(md.headers().vary, path).toMatch(/Accept/i);
    const text = await md.text();
    expect(text, path).toMatch(/^# .+/);
    expect(text.length, path).toBeGreaterThan(100);
    const explicit = await request.get(path === "/" ? "/index.md" : `${path}.md`);
    expect(explicit.status(), path).toBe(200);
    expect(await explicit.text(), path).toBe(text);
  }
  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain(`Sitemap: ${origin}/sitemap.xml`);
  const instructions = await request.get("/llms.txt");
  expect(instructions.status()).toBe(200);
  const text = await instructions.text();
  expect(text).toMatch(/^# Savvy\n\n> /);
  expect(text).toContain("When to use this:");
  expect(text).toContain("How to call:");
  expect(text).not.toContain("support@sav-e.app");
  for (const [, url] of text.matchAll(/\]\((https:\/\/savvy\.jeezlabs\.io[^)]+)\)/g)) {
    const response = await request.get(new URL(url).pathname);
    expect(response.status(), url).toBe(200);
    expect(response.headers()["content-type"], url).toContain("text/markdown");
  }
  // Fixed-format files and public images must bypass page negotiation.
  for (const path of ["/og.png", "/icon.png", "/assets/icon.png", "/metro/images/01-xiaojudan/photos/biancheng-photo.webp"]) {
    const asset = await request.get(path, { headers: { Accept: "image/avif,image/webp,*/*;q=0.8" } });
    expect(asset.status()).toBe(200);
    expect(asset.headers()["content-type"]).toContain("image/");
  }
});

test("no-JS homepage and trust pages expose meaningful content, metadata and honest schema", async ({ browser }, testInfo) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL: testInfo.project.use.baseURL, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    const response = await page.goto("/");
    await expect(page).toHaveURL(/^http:\/\/127\.0\.0\.1:\d+\/$/);
    await expect(page.locator("h1:visible")).toHaveCount(1);
    await expect(page.locator("h1:visible")).not.toBeEmpty();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /^https:\/\/savvy\.jeezlabs\.io\/?$/);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", `${origin}/og.png`);
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute("content", "website");
    await expect(page.locator('meta[name="keywords"]')).toHaveAttribute("content", /place memory/);
    await expect(page.locator('meta[name="keywords"]')).toHaveAttribute("content", /地點記憶/);
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hant");
    const content = await page.locator("main").innerText();
    expect(content.length).toBeGreaterThan(500);
    expect(content).toContain("存連結 → 確認地點 → 地圖章。");
    expect(content).toContain("從收藏地點整理下次想去的清單");
    const lowered = content.toLowerCase();
    expect(lowered).not.toContain(["trip", "planning"].join(" "));
    expect(lowered).not.toContain(["trip", "planner"].join(" "));
    expect(lowered).not.toContain(["itiner", "ary"].join(""));
    const raw = await response!.text();
    expect(raw).not.toContain("foodStations");
    const textCharacters = await page.evaluate(() => {
      const content = document.documentElement.cloneNode(true) as HTMLElement;
      content.querySelectorAll("script,style,svg").forEach(element => element.remove());
      return content.textContent!.replace(/\s+/g, " ").trim().length;
    });
    // The homepage is a map plus short place-memory copy. The inline map SVG
    // dominates byte size, so a prose-wall ratio is the wrong bar. 23 poster
    // stations add pin artwork; the measured ratio is about 0.0089.
    expect(textCharacters).toBeGreaterThan(800);
    expect(textCharacters / raw.length).toBeGreaterThan(0.008);
    const schema = JSON.parse(await page.locator('script[type="application/ld+json"]').innerText());
    const app = schema["@graph"].find((item: { "@type": string }) => item["@type"] === "SoftwareApplication");
    expect(app).toMatchObject({ name: "Savvy", url: origin, operatingSystem: "iOS" });
    const org = schema["@graph"].find((item: { "@type": string }) => item["@type"] === "Organization");
    expect(org.contactPoint).toMatchObject({ contactType: "customer support", url: `${origin}/contact` });
    expect(org).not.toHaveProperty("address");
    expect(JSON.stringify(schema)).not.toContain("support@sav-e.app");
    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      for (const path of ["/about", "/contact", "/privacy", "/docs"]) {
        await page.goto(path);
        expect((await page.locator("main").innerText()).length, path).toBeGreaterThanOrEqual(500);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${path} at ${width}`).toBe(true);
        if (path !== "/privacy") expect(await page.locator("main").innerText()).not.toContain("support@sav-e.app");
      }
    }
  } finally { await context.close(); }
});
