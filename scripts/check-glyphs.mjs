#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { ttfCmapCodepoints } from "./ttf-cmap.mjs";
import { EXAMPLE_STAMP_NOTE, PRICE_PENDING_LABEL, footNote, imageAlt } from "../lib/metro-logic.mjs";

const present = ttfCmapCodepoints("public/assets/fonts/Iansui-SavvySubset.ttf");

const metro = JSON.parse(readFileSync("app/metro/metro.public.json", "utf8"));
const ui = [
  "看到喜歡的存下",
  "去過的都記得",
  "去過了蓋個章",
  "集滿你的城市",
  "打開地圖都是回憶",
  "和朋友一起收",
  "白天黑夜都好看",
  "想去的地方都收藏",
  "把想吃的好店",
  "存進你的地圖",
  "依最新更新排序",
  "更新於",
  "本週新增",
  "家",
  "範例資料",
  "示意",
  "即將更新",
  "全圖",
  "點一站，看吃什麼",
  "捷運口袋名單",
  "菜圖為 AI 示意，非店家實拍。價格為示意。",
  "這一站的貼文還沒發。",
  "貼文發出後，店家會自動長到這張地圖上。",
  "步行約",
  "分",
  "第",
  "站",
  "共",
  "間",
  "看全部",
  "淡水河",
  "基隆河",
  "台北車站",
  "淡水信義線",
  "板南線",
  "松山新店線",
];

function collect(value, acc) {
  if (typeof value === "string") acc.push(value);
  else if (Array.isArray(value)) value.forEach((v) => collect(v, acc));
  else if (value && typeof value === "object") {
    Object.values(value).forEach((v) => collect(v, acc));
  }
}

// Label copy comes from the same pure functions the UI uses, so a new label can never skip the glyph guard.
const labelCopy = [
  EXAMPLE_STAMP_NOTE,
  PRICE_PENDING_LABEL,
  footNote({ kind: "example" }),
  footNote({ kind: "post", image: "x" }),
  imageAlt({ kind: "example", name: "", dish: "" }),
];
const strings = [...ui, ...labelCopy];
collect(metro, strings);

const skip = /[\s\dA-Za-z0-9.,:;!?'"“”‘’…—–\-_/#+@$%&()[\]{}<>~`|\\^*=]|[▲△○●□■]/u;
const missing = new Map();
for (const str of strings) {
  for (const ch of str) {
    if (skip.test(ch)) continue;
    const cp = ch.codePointAt(0);
    if (cp <= 0x7f) continue;
    if (!present.has(cp)) {
      missing.set(ch, (missing.get(ch) || 0) + 1);
    }
  }
}

if (missing.size) {
  console.error(
    "Iansui subset missing glyphs:\n" +
      [...missing.entries()].map(([ch, n]) => `  ${ch} U+${ch.codePointAt(0).toString(16).toUpperCase()} ×${n}`).join("\n"),
  );
  process.exit(1);
}

for (const ch of ["万", "菓"]) {
  if (!present.has(ch.codePointAt(0))) {
    console.error(`required glyph ${ch} missing from Iansui subset`);
    process.exit(1);
  }
}

console.log(`check-glyphs: ok (${present.size} cmap entries, 万/菓 present)`);
