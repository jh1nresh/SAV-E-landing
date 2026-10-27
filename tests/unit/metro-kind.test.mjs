import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import {
  EXAMPLE_STAMP_NOTE,
  PRICE_PENDING_LABEL,
  footNote,
  imageAlt,
  isExampleStore,
  isNewDate,
  priceIsEstimate,
  priceIsPending,
  stampNote,
} from "../../lib/metro-logic.mjs";
import { buildPublicMetro } from "../../scripts/build-metro.mjs";

const load = () => JSON.parse(readFileSync("data/metro.json", "utf8"));

/** Test-only fixture. Never written to data/metro.json. */
const postFixture = (over = {}) => ({
  id: "fixture-post-1",
  kind: "post",
  stationId: "houshanpi",
  name: "測試用店家",
  sourcePosts: [{ platform: "ig", url: "https://www.instagram.com/p/FIXTURE0001/", date: "2026-10-26" }],
  addedAt: "2026-10-26",
  verified: false,
  ...over,
});

test("every shipped store is kind=example, and _meta.example is gone", () => {
  const raw = load();
  assert.ok(raw.stores.length > 0);
  assert.ok(raw.stores.every((s) => s.kind === "example"));
  assert.equal("example" in raw._meta, false);
  const pub = buildPublicMetro(raw);
  assert.ok(pub.stores.every((s) => s.kind === "example"));
  assert.equal("example" in pub._meta, false);
});

test("kind is required and must be example|post; _meta.example is rejected", () => {
  const a = load();
  delete a.stores[0].kind;
  assert.throws(() => buildPublicMetro(a), /kind must be one of/);
  const b = load();
  b.stores[0].kind = "real";
  assert.throws(() => buildPublicMetro(b), /kind must be one of/);
  const c = load();
  c._meta.example = true;
  assert.throws(() => buildPublicMetro(c), /_meta\.example is retired/);
});

test("example entries keep today's exact labels", () => {
  const pub = buildPublicMetro(load());
  assert.equal(EXAMPLE_STAMP_NOTE, "範例資料 · 示意");
  assert.equal(stampNote(pub.stores), "範例資料 · 示意");
  for (const s of pub.stores) {
    assert.equal(isExampleStore(s), true);
    assert.equal(footNote(s), "菜圖為 AI 示意，非店家實拍。價格為示意。");
    assert.equal(imageAlt(s), `${s.dish}（AI 示意圖）`);
  }
});

test("a kind=post fixture validates, has no price, and is not labelled example", () => {
  const raw = load();
  raw.stores.push(postFixture());
  const pub = buildPublicMetro(raw);
  const post = pub.stores.find((s) => s.id === "fixture-post-1");
  assert.equal(post.kind, "post");
  assert.equal(isExampleStore(post), false);
  // price: 價格待查, never a number, never 示意
  assert.equal(post.pricePending, true);
  assert.equal("priceNT" in post, false);
  assert.equal(priceIsPending(post), true);
  assert.equal(priceIsEstimate(post), false);
  assert.equal(PRICE_PENDING_LABEL, "價格待查");
  // footer: no example/price disclosure
  assert.equal(footNote(post).includes("價格為示意"), false);
  assert.equal(footNote(post).includes("範例"), false);
  assert.equal(imageAlt(post), "測試用店家（AI 示意圖）");
  // the example entries around it are still labelled
  for (const s of pub.stores.filter((x) => x.kind === "example")) {
    assert.ok(footNote(s).includes("價格為示意"));
  }
});

test("the map-level 範例資料 stamp appears only while every entry is an example", () => {
  const raw = load();
  raw.stores.push(postFixture());
  const mixed = buildPublicMetro(raw);
  assert.equal(stampNote(mixed.stores), "");
  assert.equal(stampNote(mixed.stores.filter((s) => s.kind === "example")), EXAMPLE_STAMP_NOTE);
  assert.equal(stampNote(mixed.stores.filter((s) => s.kind === "post")), "");
  assert.equal(stampNote([]), "");
});

test("an unknown or missing kind is treated as example at render time (fail-safe: labelled)", () => {
  assert.equal(isExampleStore({}), true);
  assert.equal(isExampleStore({ kind: "whatever" }), true);
  assert.equal(isExampleStore({ kind: "post" }), false);
});

test("post entries cannot carry a price number, a placeholder link or an inline image", () => {
  const withPrice = load();
  withPrice.stores.push(postFixture({ priceNT: 80 }));
  assert.throws(() => buildPublicMetro(withPrice), /priceNT must be null/);
  const placeholder = load();
  placeholder.stores.push(postFixture({ sourcePosts: [{ platform: "ig", url: "#example", date: "2026-10-26" }] }));
  assert.throws(() => buildPublicMetro(placeholder), /placeholder|instagram.com or threads.com/);
  const inline = load();
  inline.stores.push(postFixture({ image: "data:image/png;base64,AAAA" }));
  assert.throws(() => buildPublicMetro(inline), /file path/);
  const noSource = load();
  noSource.stores.push(postFixture({ sourcePosts: [] }));
  assert.throws(() => buildPublicMetro(noSource), /sourcePosts/);
});

test("post entry rules: no price source / checked date, verified must be false, image source enum", () => {
  const add = (over) => {
    const raw = load();
    raw.stores.push(postFixture(over));
    return raw;
  };
  assert.throws(() => buildPublicMetro(add({ ["price" + "Source"]: "x" })), /price source/);
  assert.throws(() => buildPublicMetro(add({ priceCheckedAt: "2026-10-26" })), /priceCheckedAt must be absent/);
  assert.throws(() => buildPublicMetro(add({ verified: true })), /verified must be false/);
  assert.throws(() => buildPublicMetro(add({ pricePending: false })), /pricePending must be true/);
  assert.throws(() => buildPublicMetro(add({ ["image" + "Source"]: "scraped" })), /image source must be/);
  const missingVerified = add({});
  delete missingVerified.stores.at(-1).verified;
  assert.throws(() => buildPublicMetro(missingVerified), /missing verified/);
  // optional display fields may be omitted and nothing "undefined"/"null" leaks into the public payload
  const pub = buildPublicMetro(add({}));
  const text = JSON.stringify(pub.stores.at(-1));
  assert.equal(/undefined|null/.test(text), false);
});

test("P0-11 AI sentence is per entry: AI post gets it, founder/licensed photo does not, imageless post does not", () => {
  const key = "image" + "Source";
  const build = (over) => {
    const raw = load();
    raw.stores.push(postFixture(over));
    return buildPublicMetro(raw).stores.at(-1);
  };
  const ai = build({ image: "/assets/food/fixture.jpg", [key]: "ai" });
  assert.equal(footNote(ai), "菜圖為 AI 示意，非店家實拍。");
  assert.equal(imageAlt({ ...ai, dish: "鍋貼" }), "鍋貼（AI 示意圖）");
  for (const src of ["founder", "licensed"]) {
    const photo = build({ image: "/assets/food/fixture.jpg", [key]: src });
    assert.equal(photo.imageAi, false);
    assert.equal(key in photo, false); // internal, never public
    assert.equal(footNote(photo), "");
    assert.equal(imageAlt(photo), "測試用店家");
  }
  assert.equal(footNote(build({})), "");
  // example entries never gain the field and keep today's sentence
  const ex = buildPublicMetro(load()).stores[0];
  assert.equal("imageAi" in ex, false);
});

test("a post entry is NEW on the same 7-day rule as any entry (rule unchanged by P-0)", () => {
  assert.equal(isNewDate("2026-10-26", "2026-11-01"), true);
  assert.equal(isNewDate("2026-10-26", "2026-11-02"), false);
});
