import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  defaultSlug,
  foodTypeOf,
  parseFood,
  photoFor,
  shopsFor,
  stationsWithFood,
} from "../../lib/place-choice.mjs";

test("dish rules use the note text and leave everything else in 不限", () => {
  assert.equal(foodTypeOf({ dish: "孜然羊肉鍋、羊肉鍋巴飯" }), "hotpot");
  assert.equal(foodTypeOf({ dish: "帶骨豬排飯" }), "rice");
  assert.equal(foodTypeOf({ dish: "魚丸湯、阿給" }), "snack");
  assert.equal(foodTypeOf({ dish: "鮮肉小籠" }), "dumpling");
  assert.equal(foodTypeOf({ dish: "海膽石鍋豆腐" }), "any");
  assert.equal(foodTypeOf({ dish: "牛胸肉漢堡套餐" }), "any");
  assert.equal(foodTypeOf({ dish: null }), "any");
  assert.equal(parseFood("noodle"), "noodle");
  assert.equal(parseFood("rank"), "any");
  assert.equal(parseFood(null), "any");
});

test("filters stay inside the selected station and do not invent shops", () => {
  const station = {
    slug: "tamsui",
    shops: [
      { key: "a", dish: "帶骨豬排飯" },
      { key: "b", dish: "阿給" },
    ],
  };
  const other = { slug: "guting", shops: [{ key: "c", dish: "酸菜白肉鍋吃到飽" }] };
  assert.deepEqual(shopsFor(station, "rice").map((shop) => shop.key), ["a"]);
  assert.deepEqual(shopsFor(station, "hotpot"), []);
  assert.deepEqual(stationsWithFood([station, other], "hotpot").map((item) => item.slug), ["guting"]);
  assert.equal(shopsFor(station, "any").length, 2);
  assert.equal(photoFor({ images: { photos: ["/metro/images/23-tamsui/photos/a.webp"] } }, { key: "a" }), "/metro/images/23-tamsui/photos/a.webp");
  assert.equal(photoFor({ images: { photos: [] } }, { key: "missing" }), null);
  assert.equal(defaultSlug([{ slug: "dongmen" }, { slug: "tamsui" }]), "tamsui");
  assert.equal(defaultSlug([{ slug: "shanghai-yuyuan" }]), "shanghai-yuyuan");
});

test("published Tamsui note still resolves a real rice shop and a real photo", () => {
  const metro = JSON.parse(readFileSync("app/metro/metro.public.json", "utf8"));
  const tamsui = metro.foodStations.find((station) => station.slug === "tamsui");
  assert.ok(tamsui);
  const rice = shopsFor(tamsui, "rice");
  assert.ok(rice.some((shop) => shop.name === "黑殿飯店 右岸店" && shop.dish === "帶骨豬排飯" && shop.price && shop.price_source));
  assert.equal(shopsFor(tamsui, "hotpot").length, 0);
  const photo = photoFor(tamsui, rice.find((shop) => shop.key === "heidian"));
  assert.match(photo, /heidian\./);
  for (const station of [...metro.foodStations, ...metro.shanghaiFoodStations]) {
    for (const shop of station.shops) assert.equal(typeof shop.name, "string");
  }
});
