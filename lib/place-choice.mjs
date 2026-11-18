/** Classify published metro-note dishes. Unmatched dishes stay in「不限」only. */

/** @typedef {"any"|"noodle"|"rice"|"dumpling"|"soup"|"hotpot"|"snack"|"dessert"|"coffee"} FoodId */

/** @type {readonly { id: FoodId, zh: string, en: string }[]} */
export const FOOD_TYPES = [
  { id: "any", zh: "不限", en: "Anything" },
  { id: "noodle", zh: "麵", en: "Noodles" },
  { id: "rice", zh: "飯", en: "Rice" },
  { id: "dumpling", zh: "餃子", en: "Dumplings" },
  { id: "soup", zh: "湯", en: "Soup" },
  { id: "hotpot", zh: "鍋", en: "Hotpot" },
  { id: "snack", zh: "小吃", en: "Snacks" },
  { id: "dessert", zh: "甜食", en: "Sweets" },
  { id: "coffee", zh: "咖啡", en: "Coffee" },
];

const RULES = [
  ["hotpot", /火鍋|涮鍋|羊肉鍋|白肉鍋/],
  ["noodle", /麵|米粉|米線|餛飩|酸辣粉|螺螄粉/],
  ["rice", /飯|米糕|丼/],
  ["coffee", /咖啡/],
  ["dessert", /麻糬|湯圓|湯團|豆花|蛋糕|布丁|冰淇淋/],
  ["dumpling", /小籠|生煎|燒賣|水餃|蒸餃|鍋貼|鮮肉包/],
  ["snack", /阿給|腸粉|肉圓|韭菜盒|蛋餅|豬血糕|圓圓燒|滷味|雞排|臭豆腐/],
  ["soup", /湯/],
];

export const DEFAULT_PLACE = "tamsui";

/** @param {{ dish?: string | null }} shop @returns {FoodId} */
export function foodTypeOf(shop) {
  const text = typeof shop?.dish === "string" ? shop.dish : "";
  for (const [id, pattern] of RULES) {
    if (pattern.test(text)) return id;
  }
  return "any";
}

/** @param {string | null | undefined} value @returns {FoodId} */
export function parseFood(value) {
  return FOOD_TYPES.some((type) => type.id === value) ? value : "any";
}

/**
 * @template {object} T
 * @param {{ shops?: T[] }} station
 * @param {FoodId} food
 * @returns {T[]}
 */
export function shopsFor(station, food) {
  const shops = Array.isArray(station?.shops) ? station.shops : [];
  if (food === "any") return shops;
  return shops.filter((shop) => foodTypeOf(shop) === food);
}

/**
 * @template {object} T
 * @param {T[]} stations
 * @param {FoodId} food
 * @returns {T[]}
 */
export function stationsWithFood(stations, food) {
  return stations.filter((station) => shopsFor(station, food).length > 0);
}

/** @param {{ images?: { photos?: string[] } }} station @param {{ key?: string | null }} shop */
export function photoFor(station, shop) {
  if (!shop?.key) return null;
  const photos = station?.images?.photos;
  if (!Array.isArray(photos)) return null;
  return photos.find((path) => path.split("/").at(-1)?.replace(/\.[^.]+$/, "") === shop.key) ?? null;
}

/** @param {Array<{ slug: string }>} stations @param {string} city */
export function defaultSlug(stations) {
  return stations.find((station) => station.slug === DEFAULT_PLACE)?.slug ?? stations[0]?.slug ?? DEFAULT_PLACE;
}
