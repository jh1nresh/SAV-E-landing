import type { FoodStation } from "./metro";
import { guideDescription, guideStationName, shopAnchor } from "./metro-guide.mjs";

const taipeiLineNames: Record<string, string> = {
  R: "紅線", G: "綠線", BL: "藍線", O: "橘線", BR: "文湖線",
};
const mapLineCodes: Record<string, string> = {
  L_red: "R", L_green: "G", L_blue: "BL", L_orange: "O",
};
const taipeiTransfers: Record<string, string[]> = {
  dongmen: ["R", "O"],
  "nanjing-fuxing": ["G", "BR"],
  "zhongxiao-fuxing": ["BL", "BR"],
  ximen: ["BL", "G"],
  daan: ["R", "BR"],
  guting: ["G", "O"],
  zhongshan: ["R", "G"],
  "chiang-kai-shek-memorial-hall": ["R", "G"],
};

export function stationLines(station: FoodStation) {
  if (station.city === "shanghai") return (station.metro_lines ?? []).map(line => `上海 ${line} 號線`);
  const codes = taipeiTransfers[station.slug] ?? station.metro_lines ?? [mapLineCodes[station.map.line]];
  return codes.map(code => taipeiLineNames[code]).filter(Boolean);
}

export function relatedStations(station: FoodStation, stations: FoodStation[]) {
  if (station.slug === "shuanglian") {
    return ["zhongshan", "shilin"].flatMap(slug => stations.filter(other => other.slug === slug));
  }
  const lines = stationLines(station);
  return stations
    .filter(other => other.city === station.city && other.slug !== station.slug && stationLines(other).some(line => lines.includes(line)))
    .sort((a, b) => Math.hypot(a.map.at[0] - station.map.at[0], a.map.at[1] - station.map.at[1])
      - Math.hypot(b.map.at[0] - station.map.at[0], b.map.at[1] - station.map.at[1]))
    .slice(0, 3);
}

const choices: Record<string, { intro: string; meals?: string[]; scenes?: string[] }> = {
  xiaojudan: { intro: "冷天出站想喝熱湯，可以先看藥燉排骨。想吃得飽一點，選牛肉麵。人多、想分著吃，再看羊肉鍋。", scenes: ["聚餐"] },
  "raohe-songshan": { intro: "從松山站 5 號出口進饒河夜市。想吃鹹的先挑蛋餅或腸粉，最後再用冰火菠蘿收尾。", meals: ["晚餐"], scenes: ["小吃"] },
  shuanglian: { intro: "從雙連站出來，早上先找 1 號出口旁的蚵仔麵線，平日午餐可以去赤峰街吃陽春麵。這篇整理 5 家小吃與甜點，週日下午最容易排的是燒麻糬和麵茶刨冰。", meals: ["早餐", "午餐", "下午茶"], scenes: ["一人餐", "銅板小吃", "甜點"] },
  dongmen: { intro: "在永康街先決定要坐下吃一餐，還是拿著走。牛肉麵適合當正餐，天津蔥抓餅只做外帶，想吃冰再留時間給思慕昔。", meals: ["午餐", "下午茶", "晚餐"], scenes: ["小吃", "甜點"] },
  houshanpi: { intro: "早上先看永吉涼麵，午餐想吃熱的可挑珍好鍋貼。鍋貼店下午有空檔，趕時間時先對一下營業時段。", meals: ["早餐", "午餐"], scenes: ["一人餐", "銅板小吃"] },
  shilin: { intro: "早上去買手工蛋餅。傍晚再選藥燉排骨、生煎包或小碗涼麵。海友的筆記營業到午夜，想晚一點吃熱湯可以先看它。", meals: ["早餐", "晚餐", "宵夜"], scenes: ["一人餐", "銅板小吃"] },
  gongguan: { intro: "手上只想拿一份小吃，選割包或豬血糕。要吃一頓飯就看滑蛋牛肉燴飯；想去 17 食堂，記得排在平日。", meals: ["午餐", "晚餐"], scenes: ["小吃"] },
  "nanjing-fuxing": { intro: "上班日午餐先看海南雞飯，週末則要避開。過了正餐時間想吃麵，可看筆記標為 24 小時的福德涼麵，也別忘了週二休。", meals: ["午餐", "晚餐", "宵夜"], scenes: ["小吃"] },
  "zhongxiao-fuxing": { intro: "韭菜盒和涼麵適合想簡單吃一份的時候。想點熱食就看木須炒麵或鍋貼，木須麵配合午晚兩段營業時間再出發。", meals: ["午餐", "晚餐"], scenes: ["小吃"] },
  ximen: { intro: "逛西門想先吃點鹹的，可挑大腸麵線或滷肉飯加蛋。吃完再去喝楊桃冰，下午到西門時比較容易排進同一趟。", meals: ["午餐", "下午茶", "晚餐"], scenes: ["小吃", "甜點"] },
  daan: { intro: "早上用燒餅油條或酥皮蛋餅開場，午餐再挑豬腳麵或燒臘飯。想分著吃，清單還有脆皮雞半隻。", meals: ["早餐", "午餐"], scenes: ["小吃", "聚餐"] },
  guting: { intro: "從紫米飯糰、炸醬麵到臭豆腐，適合各自挑一份。想和朋友坐下吃一頓，把酸菜白肉鍋留給那餐。", meals: ["早餐"], scenes: ["小吃", "聚餐"] },
  zhongshan: { intro: "身邊有人想吃酸辣粉或螺螄粉，就從這兩碗比較。想吃湯或一份米飯，清單裡還有魷魚羹和排骨飯。" },
  daqiaotou: { intro: "早一點到大橋頭，先吃油飯或米糕。想吃熱湯就看排骨湯和鮮肉湯圓，還有一站能用綜合麻糬收尾。", meals: ["早餐", "下午茶"], scenes: ["小吃", "甜點"] },
  "chiang-kai-shek-memorial-hall": { intro: "早上先挑鹹豆漿，想吃正餐可看番茄牛肉麵。另一種排法是先買胡椒餅，再找一碗羊肉湯。", meals: ["早餐"], scenes: ["小吃"] },
  "taipei-city-hall": { intro: "想喝湯可以挑蛤蠣米粉湯，想吃麵有濃味烏龍和皮蛋乾麵。若吃飯比吃麵方便，清單還有魯肉飯。", meals: ["午餐"], scenes: ["小吃"] },
  nangang: { intro: "等車前想吃麵，可先比較牛腩麵和涼麵。要換口味，這站也有煙燻牛胸漢堡和巨無霸水餃。" },
  "taipei-101-world-trade-center": { intro: "看展前後想吃飯，可以從雞肉飯、米糕和臘味煲仔飯挑。這站的兩種麵則是炒麵和紅油皮蛋麵。", meals: ["午餐"] },
  "taipei-main-station": { intro: "趕搭車時，先看飯糰或小碗魯肉飯。若能留一餐坐下吃，再挑紅燒牛肉麵、椒麻拌麵或豬排飯。", scenes: ["小吃"] },
  "longshan-temple": { intro: "到艋舺想吃傳統小吃，可挑滷肉飯、刈包配四神湯，或炸紅燒肉配肉粥。最後再看包起司的燒麻糬。", scenes: ["小吃", "甜點"] },
  "sun-yat-sen-memorial-hall": { intro: "想幾個人分食可以先看比薩或串燒。各吃一份的話，清燉牛肉麵、宜賓燃麵和鰻重是三種方向。", scenes: ["聚餐"] },
  xiangshan: { intro: "走完象山想吃大碗一點，看雞豚白湯拉麵或鬆餅炸雞。只想墊肚子，也可以看看小份涼麵和韭菜盒。", scenes: ["小吃"] },
  tamsui: { intro: "老街上想吃阿給配魚丸湯，清單有兩家可比較。想換一頓正餐，再看帶骨豬排飯或餛飩湯配烤雞腿。", scenes: ["小吃"] },
  "shanghai-yuyuan": { intro: "逛完豫園，想簡單吃就挑鮮肉小籠或紅湯麵，飯後還有黑芝麻湯團。多人一起點菜時，可以先看八寶鴨或河蝦仁。", scenes: ["小吃", "甜點", "聚餐"] },
  "shanghai-jingan-temple": { intro: "如果只留一頓麵，先在鱔絲拌麵、醬爆豬肝麵和蔥油拌麵裡選。想吃點心就找鍋貼或蟹黃湯包。", scenes: ["小吃"] },
  "shanghai-south-huangpi-road": { intro: "逛黃陂南路時想吃小份，可以挑麻醬麵或牛肉煎包。想點菜再看糟雞與麻婆豆腐，另留一站買鮮肉月餅。", scenes: ["小吃", "聚餐"] },
  "shanghai-jiaotong-university": { intro: "想簡單吃麵就挑蔥油拌麵。幾個人同行，再看蟹粉炒粉皮、菌菇紅燒肉或松鼠鱸魚。", scenes: ["聚餐"] },
  "shanghai-dapuqiao": { intro: "走田子坊後想吃蟹粉，可以先決定要麵還是飯。要坐下分菜，再看紅燒肉、清蒸鱸魚或犛牛肉火鍋。", scenes: ["聚餐"] },
  "shanghai-nanjing-west-road": { intro: "想吃一份飯，先看本幫蔥油鰻魚釜飯。多人用餐可從乾燒明蝦、梅菜紅燒肉與白水魚挑幾道。", scenes: ["聚餐"] },
  "shanghai-lujiazui": { intro: "一桌人想吃不同地方的口味，可以從淮揚乾絲、脆皮乳鴨或徽州臭鱖魚開始選。想點本幫菜，還有紅燒肉滷蛋。", scenes: ["聚餐"] },
  "shanghai-xujiahui": { intro: "想吃簡單一點可以挑黃魚小餛飩。人多一起點菜，再看本幫紅燒肉、川味麻婆豆腐和廣式生啫。", scenes: ["聚餐"] },
};

export function stationEditorial(station: FoodStation) {
  return choices[station.slug] ?? { intro: guideDescription(station) };
}

export const shuanglianTips: Record<string, { tag: string; note: string; source?: string }> = {
  atian: { tag: "平日午餐 · 15:00 前", note: "想簡單吃一碗，就點陽春麵加滷蛋。赤峰商圈列的營業時間是平日 10:00–15:00，週末不排這家。", source: "https://chifeng.org.tw/阿田麵/" },
  oyster: { tag: "早餐 · 週日休", note: "早上到雙連想吃熱食，1 號出口右手邊就有麵線。筆記記錄 07:30 開門、週日休，清早或假日去前先確認。" },
  zinaigu: { tag: "2 號出口 · 週六可排", note: "從 2 號出口走約一分鐘，適合想加一個紅豆餅時順路停留。這份價格是五入外送價，若只買一個，以門市標價為準。" },
  yuanzai: { tag: "週二到週日 · 燒麻糬", note: "想吃熱的甜點就選燒麻糬。店家每週一公休，逢國定假日正常營業，特殊節日另看公告。", source: "https://www.sweetriceball.tw/" },
  huoshi: { tag: "下午甜點 · 赤峰街", note: "想吃冰可以把這站排在午餐後，先從麵茶牛乳雙拼看起。原筆記引用的週末時段較早開門，去之前仍要確認當日時間。" },
};

const shuanglianChoices: Record<string, { meal: string; weekend: string }> = {
  atian: { meal: "平日午餐", weekend: "六、日公休" },
  oyster: { meal: "早餐、午餐", weekend: "六開／日休（2025-10 影片）" },
  zinaigu: { meal: "點心", weekend: "六開／日休（地圖時段）" },
  yuanzai: { meal: "下午茶、晚間甜點", weekend: "六、日 11:00–21:00（店家公告）" },
  huoshi: { meal: "下午茶、晚間甜點", weekend: "六、日 12:30–21:30（2026-07 報導）" },
};

export const shuanglianComparisonHeaders = ["店家", "推薦菜", "時段", "參考價", "週末", "出口／步行"];
export function shuanglianComparison(station: FoodStation) {
  return station.shops.map((shop, index) => {
    const choice = shop.key ? shuanglianChoices[shop.key] : undefined;
    return {
      name: shop.name ?? "店家",
      anchor: shopAnchor(shop, index),
      cells: [shop.key === "oyster" ? "蚵仔麵線" : shop.dish ?? "—", choice?.meal ?? "—", shop.price ?? "—", choice?.weekend ?? "—", shop.exit_walk ?? "—"],
    };
  });
}

export const shuanglianFaq = [
  {
    question: "雙連站早上可以吃什麼？",
    answer: "1 號出口旁的雙連蚵仔麵線，2025 年 10 月影片記錄為 07:30 開門。赤峰商圈列阿田麵平日 10:00 開門，週六的滋奶谷菓子燒則可參考地圖上的 09:00。清早出發前請再確認。",
  },
  {
    question: "週末去雙連站，哪些店有開？",
    answer: "阿田麵週六、日公休。雙連蚵仔麵線和滋奶谷菓子燒的筆記是週六開、週日休。週日下午可看雙連圓仔湯與貨室甜品，前者依店家公告，後者參考 2026 年 7 月報導。",
  },
  {
    question: "雙連站半日美食路線怎麼排？",
    answer: "平日中午從 1 號出口走到阿田麵，再沿赤峰街去貨室甜品。週六早上可以從 1 號出口的麵線出發，走到 2 號出口附近買紅豆餅。星期天下午可從民生西路的雙連圓仔湯走到赤峰街吃冰。",
  },
];

export const shuanglianPlans = [
  { when: "平日午餐", parts: ["從 1 號出口走去", { name: "阿田麵", anchor: "shop-atian" }, "，15:00 前到。吃完再沿赤峰街走到", { name: "貨室甜品", anchor: "shop-huoshi" }, "。"] },
  { when: "週六早上", parts: ["先在 1 號出口旁吃", { name: "蚵仔麵線", anchor: "shop-oyster" }, "。想加一站甜點，再走到 2 號出口附近買", { name: "紅豆餅", anchor: "shop-zinaigu" }, "。"] },
  { when: "週日下午", parts: ["想吃熱甜點選", { name: "雙連圓仔湯", anchor: "shop-yuanzai" }, "，想吃冰就去", { name: "貨室甜品", anchor: "shop-huoshi" }, "。"] },
];

export function stationRelatedLabel(station: FoodStation) {
  return `${guideStationName(station)}美食`;
}
