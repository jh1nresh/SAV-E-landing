import { expect, test } from "@playwright/test";

test("official Savvy API resources are discoverable and describe live read operations", async ({ request }) => {
  const html = await (await request.get("/")).text();
  expect(html).toContain('rel="service-desc" href="/openapi.json"');
  expect(html).toContain('href="/docs">Savvy API</a>');
  expect(html).toContain('https://github.com/jh1nresh/SAV-E-landing');
  expect(html).toContain('"keywords":"美食地圖, 旅行攻略, place memory"');
  expect(html).toContain("<h1>Savvy 美食地圖與旅行攻略</h1>");
  for (const path of ["/docs", "/llms.txt", "/docs.md"]) {
    const doc = await request.get(path);
    expect(doc.ok(), path).toBe(true);
    expect(await doc.text(), path).toContain("/openapi.json");
  }

  const resource = await request.get("/openapi.json", { headers: { Accept: "application/json" } });
  expect(resource.ok()).toBe(true);
  expect(resource.headers()["content-type"]).toContain("application/json");
  const spec = await resource.json();
  expect(spec.openapi).toBe("3.1.1");
  expect(spec.servers[0].url).toBe("https://savvy.jeezlabs.io");
  expect(Object.keys(spec.paths).sort()).toEqual(["/api/public/content", "/trips/library.json"]);
  const ids = new Set();
  for (const operations of Object.values(spec.paths)) {
    const { get } = operations as { get: { operationId: string; description: string } };
    expect(get.operationId).toBeTruthy();
    expect(get.description).toBeTruthy();
    expect(ids.has(get.operationId)).toBe(false);
    ids.add(get.operationId);
  }

  const catalog = await request.get("/trips/library.json", { headers: { Accept: "application/json" } });
  expect(catalog.ok()).toBe(true);
  const rows = await catalog.json();
  expect(rows.length).toBeGreaterThan(0);
  for (const row of rows) {
    expect(row.kind).toMatch(/^(guide|post)$/);
    expect(row.href).toMatch(/^\//);
    expect(row.title).toBeTruthy();
    if (row.kind === "post") expect(row.source).toMatch(/^https:\/\/www\.threads\.com\//);
  }

  const document = await request.get("/api/public/content", { params: { path: "/zh-tw/travel" }, headers: { Accept: "application/json" } });
  expect(document.ok()).toBe(true);
  expect(document.headers()["content-type"]).toContain("application/json");
  const markdown = await (await request.get("/zh-tw/travel", { headers: { Accept: "text/markdown" } })).text();
  expect(await document.json()).toEqual({ url: "https://savvy.jeezlabs.io/zh-tw/travel", markdown });
  const head = await request.head("/api/public/content", { params: { path: "/" } });
  expect(head.status()).toBe(200);
  expect(await head.text()).toBe("");
});

test("invalid, missing and unsupported public API requests return actionable Problem Details", async ({ request }) => {
  for (const [method, path, status, code] of [
    ["GET", "/api/public/content", 400, "invalid_path"],
    ["GET", "/api/public/content?path=%2Fa&path=%2Fb", 400, "invalid_path"],
    ["GET", "/api/public/content?path=%2F%2Fexample.org", 400, "invalid_path"],
    ["GET", "/api/public/content?path=%2Fprivacy%3Ftoken%3Dprivate-fixture", 400, "invalid_path"],
    ["GET", "/api/public/content?path=%2Fprivate-fixture", 404, "content_not_found"],
    ["GET", "/api/public/content?path=%2Fapi%2Ftest-list", 404, "content_not_found"],
    ["GET", "/api/public/private-fixture", 404, "endpoint_not_found"],
    ["POST", "/api/public/content", 405, "method_not_allowed"],
  ] as const) {
    const response = await request.fetch(path, { method, headers: { Accept: "application/json" } });
    expect(response.status(), path).toBe(status);
    expect(response.headers()["content-type"], path).toContain("application/problem+json");
    const problem = await response.json();
    expect(problem).toMatchObject({ type: "about:blank", status, code });
    for (const property of ["title", "detail", "hint"]) expect(problem[property], path).toBeTruthy();
    expect(JSON.stringify(problem), path).not.toContain("private-fixture");
    if (status === 405) expect(response.headers().allow).toBe("GET, HEAD, OPTIONS");
  }
});
