import { guides, GUIDE_ROOT, guidePath } from "../app/zh-tw/guides/content";
import { TRAVEL_ROOT, travelGuides, travelPath } from "../app/zh-tw/travel/content";
import { postPath, sourceOnlyPosts, threadPosts } from "../app/zh-tw/posts/content";
import { getFoodStations, getShanghaiFoodStations } from "./metro";
import { shopSearchHref, guideDescription, guideHeading, guideUpdatedAt, shopAnchor, shopMapLink } from "./metro-guide.mjs";
import { relatedStations, shuanglianPlans, shuanglianTips, stationEditorial } from "./metro-editorial";
import { FOOD_DISCLAIMER, foodShopRows } from "./metro-logic.mjs";
import { HERO_EN, HERO_ZH, SITE_DESCRIPTION_EN, SITE_DESCRIPTION_ZH, SITE_TITLE_EN, SITE_TITLE_ZH, TESTFLIGHT_URL } from "../app/site";
import { infoPages, privacyGuidance, SITE_ORIGIN } from "./site-content";

const link = (name: string, path: string) => `[${name}](${SITE_ORIGIN}${path})`;
const sections = (items: readonly { heading: string; text: string }[]) => items.map(item => `## ${item.heading}\n\n${item.text}`).join("\n\n");
const resources = `## Public resources\n\n${[
  ["About Savvy", "/about"], ["Contact Savvy", "/contact"], ["Privacy", "/privacy"],
  ["Savvy API documentation and agent access", "/docs"], ["Savvy homepage", "/"],
  ["Shanghai metro food notes", "/shanghai"], ["Taipei and Shanghai food guides", "/metro"],
  ["旅行攻略", TRAVEL_ROOT], ["城市貼文", "/zh-tw/posts"], ["收藏整理指南", GUIDE_ROOT], ["Agent instructions", "/llms.txt"], ["Sitemap", "/sitemap.xml"],
].map(([name, path]) => `- ${link(name, path)}`).join("\n")}`;

export const llmsText = `# Savvy

> Savvy is place memory. Save a link, confirm the spot, stamp it on your map. This site publishes product information, Traditional Chinese guides, and public Taipei and Shanghai metro food notes. The homepage is the Savvy travel workspace. The Taipei metro map is at /discover and the Shanghai map is at /shanghai.

When to use this: reach for Savvy when explaining how a shared place link becomes a clue, a Review Candidate and then a user-confirmed Map Stamp; when organizing saved restaurant sources; or when reading the public Taipei and Shanghai food guides. Public notes are not a user's saved or visited places.

How to call: use GET or HEAD on the public URLs below. Send Accept: text/markdown for Markdown at a page's canonical URL, or follow its explicit .md version (the homepage uses /index.md). HTML remains available with Accept: text/html. Read /sitemap.xml for the public page inventory. No login or credentials are needed to read these pages.

Integration boundary: this landing site advertises no supported public account API, MCP server, SDK or CLI. Do not invent endpoints, request credentials, upload private collections or claim you can mutate a user's memory. Suggestions require user review; do not infer a saved place or visit from a public guide. Keep source links and example disclosures. TestFlight features and availability depend on the current build.

## Product and agent guidance

- ${link("Savvy overview", "/index.md")}: Product workflow, availability and limits.
- ${link("Savvy API documentation", "/docs.md")}: HTTP access, examples and integration limits.
- ${link("OpenAPI specification", "/openapi.json")}: Machine-readable contract for the public content API.
- ${link("About Savvy", "/about.md")}: Product identity and place-memory states.

## Public guides

- ${link("Taipei and Shanghai food notes", "/metro.md")}: Station pages and source disclosures.
- ${link("旅行攻略", `${TRAVEL_ROOT}.md`)}: Destination guides with sources and visit planning details.
- ${link("城市貼文", "/zh-tw/posts.md")}: Savvy's public posts and links to their Threads originals.
- ${link("收藏整理指南", `${GUIDE_ROOT}.md`)}: Traditional Chinese guide index.
${guides.map(guide => `- ${link(guide.label, `${guidePath(guide.slug)}.md`)}: ${guide.description}`).join("\n")}

## Support and privacy

- ${link("Contact guidance", "/contact.md")}: Find help without sending private collections.
- ${link("Privacy", "/privacy.md")}: Public website and private-memory boundaries.
`;

// Only curated public data enters this representation; no account or share lookup.
function taipeiHomeMarkdown() {
  return `# ${SITE_TITLE_ZH}\n\n${SITE_DESCRIPTION_ZH}\n\n${SITE_TITLE_EN}\n\n${SITE_DESCRIPTION_EN}\n\n${HERO_ZH.join("\n")}\n\n${HERO_EN.join("\n")}\n\n[Public iOS TestFlight invitation](${TESTFLIGHT_URL})\n\n${resources}\n`;
}

function shanghaiMarkdown() {
  const stations = getShanghaiFoodStations();
  const body = stations.map((station) => `## ${station.station}\n\n第 ${station.n} 站。${station.metro_lines?.length ? `${station.metro_lines.join("、")} 號線。` : ""}\n\n${station.shops.map((shop) => `- ${shop.name ?? "店家"}：${shop.address ?? ""}`).join("\n")}`).join("\n\n");
  return `# 上海地鐵美食｜Savvy\n\n中文為主。店名和地址用中文，方便給司機或店員看。價錢是人民幣（¥）；筆記沒寫價錢的店，不顯示金額。\n\n${body}\n\n${resources}\n`;
}

export function markdownFor(path: string): string | null {
  if (path === "/") return `# Savvy 美食地圖與旅行攻略

找下一站要吃什麼、去哪裡走走。Savvy iOS App 可以儲存社群連結、確認地點，並把想去的地方排進行程。

我的行程、城市圖鑑、收藏與遊記是瀏覽器中的工作區。攻略與公開貼文可以無須登入直接閱讀。公開的店家清單與示例行程不代表任何人的到訪紀錄。

${resources}
`;
  if (path === "/discover") return taipeiHomeMarkdown();
  if (path === "/shanghai") return shanghaiMarkdown();
  if (path === TRAVEL_ROOT || path === "/zh-tw/posts") {
    const isGuide = path === TRAVEL_ROOT;
    const entries = isGuide
      ? travelGuides.map(g => link(g.title, travelPath(g.slug)))
      : [
          ...threadPosts.map(p => `${link(p.title, postPath(p.code))} · [Threads 原文](${p.url})`),
          ...sourceOnlyPosts.map(p => `${link(p.title, p.href)} · [Threads 原文](${p.url})`),
        ];
    return `# ${isGuide ? "旅行攻略" : "城市貼文"}\n\n${entries.map(entry => "- " + entry).join("\n")}\n\n${resources}\n`;
  }
  if (path.startsWith(TRAVEL_ROOT + "/")) {
    const guide = travelGuides.find(g => path === travelPath(g.slug));
    if (!guide) return null;
    const body = guide.sections.map(({ heading, paragraphs, table }) => {
      const parts = paragraphs.map(p => [p.text, ...(p.links ?? []).map(l => `[${l.label}](${l.href})`)].join(" "));
      if (table) {
        const row = (cells: string[]) => "| " + cells.map(cell => cell.replaceAll("|", "\\|")).join(" | ") + " |";
        parts.push(table.caption + "\n\n" + [row(table.columns), row(table.columns.map(() => "---")), ...table.rows.map(row)].join("\n"));
      }
      return `## ${heading}\n\n${parts.join("\n\n")}`;
    });
    return [`# ${guide.title}`, guide.description, [guide.region, guide.city, guide.date].join(" · "), ...body, resources].join("\n\n") + "\n";
  }
  if (path.startsWith("/zh-tw/posts/")) {
    const post = threadPosts.find(p => postPath(p.code) === path);
    if (!post) return null;
    return [`# ${post.title}`, post.date, ...(post.publishedExcerpt ? ["節錄，兩筆評論價格請見 Threads 原文。"] : []), post.text, `[@savvysave_ 原文](${post.url})`, resources].join("\n\n") + "\n";
  }
  const key = path.slice(1) as keyof typeof infoPages;
  if (Object.hasOwn(infoPages, key)) {
    const page = infoPages[key];
    return `# ${page.title}\n\n${page.description}\n\n${sections(page.sections)}\n\n${key === "docs" ? `\`curl -i -H 'Accept: text/markdown' ${SITE_ORIGIN}/\`\n\n[OpenAPI specification](https://savvy.jeezlabs.io/openapi.json) · [Public guide catalog](https://savvy.jeezlabs.io/trips/library.json)\n\n[Website code on GitHub](https://github.com/jh1nresh/SAV-E-landing)\n\n` : ""}${resources}\n`;
  }
  if (path === "/privacy") return `# Savvy Privacy Policy\n\nSavvy is your private place memory. Places you confirm and save stay yours by default. We do not sell your map. Free keeps 50 saved places. Pro is unlimited saved places.\n\n${sections(privacyGuidance)}\n\n${resources}\n`;
  if (path === "/support") return `# Savvy Support\n\nRead ${link("the HTML support page", "/support")} for the existing published support channel. Share a short, redacted problem description rather than passwords, tokens or an entire place collection.\n\n[Public TestFlight invitation](${TESTFLIGHT_URL})\n\nAvailability and version are determined by Apple and the current build.\n\n${resources}\n`;
  if (path === GUIDE_ROOT) return `# Savvy 收藏整理指南\n\n先留下來源，再確認地點。指南目前提供繁體中文。不需要在網站上傳私人收藏或匯入檔案。\n\n${guides.map(guide => `- ${link(guide.label, guidePath(guide.slug))}: ${guide.description}`).join("\n")}\n\n${resources}\n`;
  const guide = guides.find(entry => path === guidePath(entry.slug));
  if (guide) return `# ${guide.title}\n\n${guide.description}\n\n內容核對：${guide.updatedAt} · iOS 測試版操作參考。各項入口可能依測試版本而異；若沒有文中功能，先查看支援資訊，不要分享完整私人資料。\n\n${guide.sections.map(section => `## ${section.heading}\n\n${section.blocks.map(block => {
    if (block.type === "steps" && "items" in block) return block.items?.map((item, i) => `${i + 1}. ${item}`).join("\n");
    if (block.type === "table" && "rows" in block) return block.rows?.map((row, i) => `| ${row.join(" | ")} |${i === 0 ? `\n| ${row.map(() => "---").join(" | ")} |` : ""}`).join("\n");
    return `${block.type === "question" ? "### " : ""}${"text" in block ? block.text : ""}`;
  }).join("\n\n")}`).join("\n\n")}\n\n[查看 Savvy TestFlight 測試版](${TESTFLIGHT_URL})\n\n這不是 App Store 正式下載。${resources}\n`;
  if (path === "/metro") return `# 台北、上海捷運美食攻略｜Savvy\n\n${FOOD_DISCLAIMER}\n\n${[{ name: '台北捷運美食', stations: getFoodStations() }, { name: '上海地鐵美食', stations: getShanghaiFoodStations() }].map(city => `## ${city.name}\n\n${city.stations.map(station => `- ${link(guideHeading(station), `/metro/${station.slug}`)}: ${stationEditorial(station).intro}`).join("\n")}`).join("\n\n")}\n\n${resources}\n`;
  const stations = [...getFoodStations(), ...getShanghaiFoodStations()];
  const station = stations.find(entry => path === `/metro/${entry.slug}`);
  if (station) {
    const more = relatedStations(station, stations).map(other => link(guideHeading(other), `/metro/${other.slug}`));
    const dayPlans = station.slug === "shuanglian"
      ? ["## 平日和週末怎麼吃", shuanglianPlans.map(({ when, parts }) => `- **${when}** ${parts.map(part => typeof part === "string" ? part : link(part.name, `/metro/${station.slug}#${part.anchor}`)).join("")}`).join("\n")]
      : [];
    const shops = station.shops.map(shop => {
      const map = shopMapLink(station, shop);
      const tip = station.slug === "shuanglian" && shop.key ? shuanglianTips[shop.key] : undefined;
      const rows = foodShopRows(shop, station.city).map(([label, value]) => `- ${label}: ${value}`).join("\n");
      return [`## ${shop.name ?? "店家"}`, tip?.note, rows, tip?.source && `[店家或商圈公告](${tip.source})`,
        `[Google Maps](${shopSearchHref(station, shop)}) · [${map.label}](${map.href})`].filter(Boolean).join("\n\n");
    });
    return [`# ${guideHeading(station)}｜Savvy`, guideDescription(station), `原始筆記：${station.date} · 頁面更新：${guideUpdatedAt(station)}`,
      stationEditorial(station).intro, FOOD_DISCLAIMER,
      Object.entries(station.posts).filter(([, url]) => url).map(([name, url]) => `[${name}](${url})`).join(" · "),
      ...dayPlans, "## 店家快速索引", station.shops.map((shop, index) => `- ${link(shop.name ?? "店家", `/metro/${station.slug}#${shopAnchor(shop, index)}`)}`).join("\n"),
      ...shops, "外送價不等於店內價；舊菜單或食記價格不代表今天售價。查詢日期不等於店家更新日期；暫停供應、堂食與窗口限制請看各店說明。步行數字採來源估計，起點可能是其他鄰近車站。地圖連結依店名與地址搜尋，出發前請確認分店與當日營業時間。",
      "## 把想吃的店留到下次",
      "在 iPhone 分享店家連結給 Savvy，或複製到 App。確認分店後，再存進自己的地圖。",
      link("查看 Savvy App 測試名單", "/#app"),
      ...(more.length ? ["## 同線延伸推薦", more.join(" · ")] : []), resources].filter(Boolean).join("\n\n") + "\n";
  }
  return null;
}

export const notFoundMarkdown = `# 404 — Page not found\n\nThe requested Savvy public page does not exist. Find available pages in ${link("the sitemap", "/sitemap.xml")} or ${link("the agent instructions", "/llms.txt")}.\n`;
