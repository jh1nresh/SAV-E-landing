import { guides, GUIDE_ROOT, guidePath } from "../app/zh-tw/guides/content";
import { getFoodStations } from "./metro";
import { FOOD_DISCLAIMER, foodShopRows } from "./metro-logic.mjs";
import { TESTFLIGHT_URL } from "../app/site";
import { homeSections, infoPages, privacyGuidance, SITE_ORIGIN, SITE_TITLE, SITE_DESCRIPTION } from "./site-content";

const link = (name: string, path: string) => `[${name}](${SITE_ORIGIN}${path})`;
const sections = (items: readonly { heading: string; text: string }[]) => items.map(item => `## ${item.heading}\n\n${item.text}`).join("\n\n");
const resources = `## Public resources\n\n${[
  ["About Savvy", "/about"], ["Contact Savvy", "/contact"], ["Privacy", "/privacy"],
  ["Savvy API documentation and agent access", "/docs"], ["Taipei food guides", "/metro"],
  ["收藏整理指南", GUIDE_ROOT], ["Agent instructions", "/llms.txt"], ["Sitemap", "/sitemap.xml"],
].map(([name, path]) => `- ${link(name, path)}`).join("\n")}`;

export const llmsText = `# Savvy

> Savvy is an iOS app for saved-place memory and trip planning. This site publishes product information, Traditional Chinese guides and public Taipei food notes.

When to use this: reach for Savvy when explaining how a shared place link becomes a clue, a Review Candidate and then a user-confirmed Map Stamp; when organizing saved restaurant sources; or when reading the public Taipei food guides. Public notes are not a user's saved or visited places.

How to call: use GET or HEAD on the public URLs below. Send Accept: text/markdown for Markdown at a page's canonical URL, or follow its explicit .md version (the homepage uses /index.md). HTML remains available with Accept: text/html. Read /sitemap.xml for the public page inventory. No login or credentials are needed to read these pages.

Integration boundary: this landing site advertises no supported public account API, MCP server, SDK or CLI. Do not invent endpoints, request credentials, upload private collections or claim you can mutate a user's memory. Suggestions require user review; do not infer a saved place or visit from a public guide. Keep source links and example disclosures. TestFlight features and availability depend on the current build.

## Product and agent guidance

- ${link("Savvy overview", "/index.md")}: Product workflow, availability and limits.
- ${link("Savvy API documentation", "/docs.md")}: When to use the site, HTTP access and unavailable integrations.
- ${link("About Savvy", "/about.md")}: Product identity and place-memory states.

## Public guides

- ${link("Taipei food notes", "/metro.md")}: Station pages and source disclosures.
- ${link("收藏整理指南", `${GUIDE_ROOT}.md`)}: Traditional Chinese guide index.
${guides.map(guide => `- ${link(guide.label, `${guidePath(guide.slug)}.md`)}: ${guide.description}`).join("\n")}

## Support and privacy

- ${link("Contact guidance", "/contact.md")}: Find help without sending private collections.
- ${link("Privacy", "/privacy.md")}: Public website and private-memory boundaries.
`;

// Only curated public data enters this representation; no account or share lookup.
export function markdownFor(path: string): string | null {
  if (path === "/") return `# ${SITE_TITLE}\n\n${SITE_DESCRIPTION}\n\n${sections(homeSections)}\n\n[Public iOS TestFlight invitation](${TESTFLIGHT_URL})\n\n${resources}\n`;
  const key = path.slice(1) as keyof typeof infoPages;
  if (Object.hasOwn(infoPages, key)) {
    const page = infoPages[key];
    return `# ${page.title}\n\n${page.description}\n\n${sections(page.sections)}\n\n${key === "docs" ? `\`curl -i -H 'Accept: text/markdown' ${SITE_ORIGIN}/\`\n\n[Website code on GitHub](https://github.com/jh1nresh/SAV-E-landing)\n\n` : ""}${resources}\n`;
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
  if (path === "/metro") return `# Savvy 捷運美食清單\n\n${FOOD_DISCLAIMER}\n\n${getFoodStations().map(station => `- ${link(station.station, `/metro/${station.slug}`)}: ${station.tagline ?? ""}`).join("\n")}\n\n${resources}\n`;
  const station = getFoodStations().find(entry => path === `/metro/${entry.slug}`);
  if (station) return `# ${station.station}站美食清單｜Savvy\n\n${station.date} · ${station.tagline ?? ""}\n\n${FOOD_DISCLAIMER}\n\n${Object.entries(station.posts).filter(([, url]) => url).map(([name, url]) => `[${name}](${url})`).join(" · ")}\n\n${station.shops.map(shop => `## ${shop.name ?? "店家"}\n\n${foodShopRows(shop).map(([label, value]) => `- ${label}: ${value}`).join("\n")}`).join("\n\n")}\n\n${resources}\n`;
  return null;
}

export const notFoundMarkdown = `# 404 — Page not found\n\nThe requested Savvy public page does not exist. Find available pages in ${link("the sitemap", "/sitemap.xml")} or ${link("the agent instructions", "/llms.txt")}.\n`;
