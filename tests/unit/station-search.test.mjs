import assert from "node:assert/strict";
import { test } from "node:test";
import {
  EMPTY_RESULTS,
  announcement,
  buildSearchIndex,
  filterStations,
  groupLabel,
  lineOptions,
  lineText,
  matchShop,
  resultCountText,
  stationMeta,
} from "../../lib/station-search.mjs";

const taipei = [
  {
    city: "taipei", n: 1, station: "小巨蛋", slug: "xiaojudan", selectId: "arena",
    nameEn: null, line: "松山新店線", metroLines: null,
    shops: [
      { name: "万端 By 肝苦嘆呷郎", dish: "牛肉麵、麻婆豆腐麵、炸黑豬排骨" },
      { name: "邊城孜然羊肉", dish: "孜然羊肉鍋" },
    ],
  },
  {
    city: "taipei", n: 3, station: "雙連", slug: "shuanglian", selectId: "shuanglian",
    nameEn: null, line: "淡水信義線", metroLines: null,
    shops: [{ name: "阿田麵", dish: "古早味陽春麵＋滷蛋" }],
  },
];

const shanghai = [
  {
    city: "shanghai", n: 2, station: "豫園", slug: "shanghai-yuyuan", selectId: "shanghai-yuyuan",
    nameEn: "Yuyuan", line: null, metroLines: ["10", "14"],
    shops: [{ name: "松鶴樓麵館（豫園店）", dish: "蘇式紅湯麵" }],
  },
  {
    city: "shanghai", n: 3, station: "靜安寺", slug: "shanghai-jingan-temple", selectId: "shanghai-jingan-temple",
    nameEn: "Jing'an Temple", line: null, metroLines: ["2", "7", "14"],
    shops: [{ name: "毒蛇麵館（靜安寺店）", dish: "響油鱔絲拌麵" }],
  },
  {
    city: "shanghai", n: 4, station: "黃陂南路", slug: "shanghai-south-huangpi-road", selectId: "shanghai-south-huangpi-road",
    nameEn: "South Huangpi Rd", line: null, metroLines: ["1", "14"],
    shops: [{ name: "味香齋（雁蕩路店）", dish: "麻醬麵" }],
  },
];

test("matches station name, shop name, dish, and English name", () => {
  assert.equal(filterStations(taipei, { query: "小巨蛋" }).map((s) => s.slug).join(), "xiaojudan");
  assert.equal(filterStations(taipei, { query: "阿田" }).map((s) => s.slug).join(), "shuanglian");
  assert.equal(filterStations(taipei, { query: "麻醬" }).length, 0);
  assert.deepEqual(filterStations(taipei, { query: "麵" }).map((s) => s.station), ["小巨蛋", "雙連"]);
  assert.equal(filterStations(shanghai, { query: "yuyuan" }).map((s) => s.station).join(), "豫園");
  assert.equal(filterStations(shanghai, { query: "JING" }).map((s) => s.station).join(), "靜安寺");
  assert.equal(filterStations(taipei, { query: "   " }).length, taipei.length);
  assert.equal(filterStations(taipei, { query: "沒有這家" }).length, 0);
});

test("line filter keeps only stations that list that line", () => {
  assert.deepEqual(filterStations(shanghai, { line: "1 號線" }).map((s) => s.station), ["黃陂南路"]);
  assert.deepEqual(filterStations(shanghai, { line: "14 號線", query: "麵" }).map((s) => s.station), ["豫園", "靜安寺", "黃陂南路"]);
  assert.deepEqual(filterStations(shanghai, { line: "2 號線", query: "小籠" }).map((s) => s.station), []);
  assert.deepEqual(lineOptions(shanghai), ["1 號線", "2 號線", "7 號線", "10 號線", "14 號線"]);
  assert.equal(lineOptions(shanghai).includes("3 號線"), false);
  assert.equal(lineText(shanghai[0]), "10 號線、14 號線");
  assert.equal(lineText(taipei[0]), "松山新店線");
  assert.equal(stationMeta(taipei[0]), "第 1 站 · 松山新店線");
});

test("shop hit is the matching dish, and stays off when the station name matched", () => {
  assert.equal(matchShop(taipei[0], "麵")?.name, "万端 By 肝苦嘆呷郎");
  assert.equal(matchShop(taipei[1], "阿田")?.dish, "古早味陽春麵＋滷蛋");
  assert.equal(matchShop(taipei[0], "小巨蛋"), undefined);
  assert.equal(matchShop(taipei[0], ""), undefined);
  assert.equal(matchShop(shanghai[2], "麻醬")?.name, "味香齋（雁蕩路店）");
});

test("count text and Chinese announcements", () => {
  assert.equal(EMPTY_RESULTS, "這個篩選下沒有符合的站，換個字試試。");
  assert.equal(resultCountText(3, "麵"), "3 站符合「麵」");
  assert.equal(resultCountText(14, "麵"), "14 站符合「麵」 · 往下捲看更多");
  assert.equal(resultCountText(17, ""), "共 17 站 · 往下捲看更多");
  assert.equal(resultCountText(2, ""), "共 2 站");
  assert.equal(announcement({ type: "results", count: 3, query: "麵", loading: false }), "3 個站");
  assert.equal(announcement({ type: "results", count: 0, query: "x", loading: false }), "沒有符合的站");
  assert.equal(announcement({ type: "results", count: 0, query: "", loading: true }), "載入中");
  assert.equal(announcement({ type: "removed", label: "豫園" }), "已移除 豫園");
  assert.equal(announcement({ type: "other" }), null);
  assert.equal(groupLabel("taipei"), "台北捷運");
  assert.equal(groupLabel("shanghai"), "上海地鐵");
});

test("index uses the published metro id and line, and only real Shanghai lines", () => {
  const indexed = buildSearchIndex(
    [
      { n: 4, station: "東門", slug: "dongmen", shops: [{ name: "永康牛肉麵", dish: "紅燒牛肉麵" }] },
      { n: 1, city: "taipei", station: "小巨蛋", slug: "xiaojudan", metro_lines: ["BL"], shops: [{ name: "", dish: "略過" }, { name: "万端", dish: null }] },
      { n: 4, city: "shanghai", station: "黃陂南路", slug: "shanghai-south-huangpi-road", name_en: "South Huangpi Rd", metro_lines: ["1", "14"], shops: [{ name: "味香齋", dish: "麻醬麵" }] },
    ],
    [
      { id: "arena", slug: "xiaojudan", line: "松山新店線" },
      { id: "dongmen", slug: "dongmen", line: "淡水信義線" },
    ],
  );
  assert.deepEqual(indexed.map((s) => [s.n, s.selectId, s.line, s.metroLines]), [
    [1, "arena", "松山新店線", null],
    [4, "dongmen", "淡水信義線", null],
    [4, "shanghai-south-huangpi-road", null, ["1", "14"]],
  ]);
  assert.deepEqual(indexed[0].shops, [{ name: "万端", dish: null }]);
  assert.deepEqual(lineOptions(indexed.filter((s) => s.city === "shanghai")), ["1 號線", "14 號線"]);
  assert.equal(indexed[2].nameEn, "South Huangpi Rd");
});
