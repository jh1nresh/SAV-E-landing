import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import {
  EXAMPLE_STAMP_NOTE,
  EXAMPLE_STAMP_NOTE_EN,
  PARTIAL_STAMP_NOTE,
  PARTIAL_STAMP_NOTE_EN,
  PRICE_PENDING_LABEL,
  countBadge,
  countLabel,
  countShort,
  footNote,
  imageAlt,
  isExampleStore,
  isNewDate,
  priceIsEstimate,
  priceIsPending,
  stampLevel,
  stampNote,
  weekNewCount,
} from "../../lib/metro-logic.mjs";
import { buildPublicMetro } from "../../scripts/build-metro.mjs";

const load = () => JSON.parse(readFileSync("data/metro.json", "utf8"));

/** Test-only fixture. Never written to data/metro.json. */
const postFixture = (over = {}) => ({
  id: "fixture-post-1",
  kind: "post",
  stationId: "houshanpi",
  name: "測試用店家",
  sourcePosts: [{ platform: "ig", url: "https://www.instagram.com/savvysave_/p/FIXTURE0001/", date: "2026-10-26" }],
  addedAt: "2026-10-26",
  verified: false,
  ...over,
});

test("every shipped store declares its kind, and _meta.example is gone", () => {
  const raw = load();
  assert.ok(raw.stores.length > 0);
  assert.ok(raw.stores.every((s) => ["example", "post"].includes(s.kind)));
  assert.equal("example" in raw._meta, false);
  const pub = buildPublicMetro(raw);
  assert.deepEqual(pub.stores.map((s) => s.kind), raw.stores.map((s) => s.kind));
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
  const examples = pub.stores.filter(isExampleStore);
  assert.ok(examples.length > 0);
  assert.equal(stampNote(examples), "範例資料 · 示意");
  for (const s of examples) {
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

test("P0-10 map-level stamp: all example = full stamp, mixed = smaller 部分為範例, all post = none", () => {
  const raw = load();
  raw.stores.push(postFixture());
  const mixed = buildPublicMetro(raw);
  const examples = mixed.stores.filter((s) => s.kind === "example");
  const posts = mixed.stores.filter((s) => s.kind === "post");
  assert.equal(stampLevel(examples), "example");
  assert.equal(stampNote(examples), EXAMPLE_STAMP_NOTE);
  assert.equal(stampNote(examples, "en"), EXAMPLE_STAMP_NOTE_EN);
  assert.equal(stampLevel(mixed.stores), "partial");
  assert.equal(stampNote(mixed.stores), "部分為範例");
  assert.equal(stampNote(mixed.stores), PARTIAL_STAMP_NOTE);
  assert.equal(stampNote(mixed.stores, "en"), PARTIAL_STAMP_NOTE_EN);
  assert.equal(stampLevel(posts), "none");
  assert.equal(stampNote(posts), "");
  assert.equal(stampNote(posts, "en"), "");
  assert.equal(stampLevel([]), "none");
  assert.equal(stampNote([]), "");
  // a lone unknown kind is fail-safe example
  assert.equal(stampLevel([{ kind: "whatever" }, { kind: "post" }]), "partial");
});

test("P0-10 'n 間' count: never one summed number when mixed", () => {
  const ex = (n) => Array.from({ length: n }, () => ({ kind: "example" }));
  const po = (n) => Array.from({ length: n }, () => ({ kind: "post" }));
  // all example / all post / empty: plain count (unchanged for shipped data)
  assert.equal(countLabel(ex(3)), "3 間");
  assert.equal(countLabel(ex(3), "en"), "3 places");
  assert.equal(countLabel(po(2)), "2 間");
  assert.equal(countLabel(po(2), "en"), "2 places");
  assert.equal(countLabel(po(1), "en"), "1 place");
  assert.equal(countLabel([]), "0 間");
  // mixed
  assert.equal(countLabel([...po(1), ...ex(2)]), "3 間（1 間來自貼文、2 間為範例）");
  assert.equal(countLabel([...po(1), ...ex(2)], "en"), "3 places (1 from posts, 2 examples)");
  assert.equal(countLabel([...ex(1), ...po(3)]), "4 間（3 間來自貼文、1 間為範例）");
  assert.equal(countShort(5), "5 間");
  assert.equal(countShort(5, "en"), "5 places");
  assert.equal(countBadge([...po(1), ...ex(2)]), "1 貼文 · 2 範例");
  assert.equal(countBadge(ex(3)), "3 間");
  assert.equal(countBadge(po(2)), "2 間");
});

test("P-1 headline excludes examples and historical posts", () => {
  const raw = load();
  raw.stores.push(postFixture({ addedAt: "2026-10-26" }));
  const mixed = buildPublicMetro(raw);
  assert.equal(weekNewCount(mixed.stores, "2026-10-27"), 0);
  assert.equal(weekNewCount([], "2026-10-27"), 0);
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
  assert.equal(footNote(ai), "菜圖為 AI 示意，非店家實拍。價格、營業時間可能調整，出發前再確認。");
  assert.equal(imageAlt({ ...ai, dish: "鍋貼" }), "鍋貼（AI 示意圖）");
  for (const src of ["founder", "licensed"]) {
    const photo = build({ image: "/assets/food/fixture.jpg", [key]: src });
    assert.equal(photo.imageAi, false);
    assert.equal(key in photo, false); // internal, never public
    assert.equal(footNote(photo), "價格、營業時間可能調整，出發前再確認。");
    assert.equal(imageAlt(photo), "測試用店家");
  }
  assert.equal(footNote(build({})), "價格、營業時間可能調整，出發前再確認。");
  // example entries never gain the field and keep today's sentence
  const ex = buildPublicMetro(load()).stores[0];
  assert.equal("imageAi" in ex, false);
});

test("a post entry is NEW on the same 7-day rule as any entry (rule unchanged by P-0)", () => {
  assert.equal(isNewDate("2026-10-26", "2026-11-01"), true);
  assert.equal(isNewDate("2026-10-26", "2026-11-02"), false);
});

test("the output gate accepts an imageless post without relaxing example image requirements", () => {
  const raw = load();
  raw.stores.push(postFixture());
  const pub = buildPublicMetro(raw);
  const dir = mkdtempSync(join(tmpdir(), "savvy-output-gate-"));
  try {
    mkdirSync(join(dir, "app/metro"), { recursive: true });
    symlinkSync(resolve("public"), join(dir, "public"), "dir");
    const run = () => {
      writeFileSync(join(dir, "app/metro/metro.public.json"), JSON.stringify(pub));
      return spawnSync(process.execPath, [resolve("scripts/check-output.mjs")], { cwd: dir, encoding: "utf8" });
    };
    const valid = run();
    assert.equal(valid.status, 0, valid.stderr);
    delete pub.stores[0].image;
    const invalid = run();
    assert.notEqual(invalid.status, 0);
    assert.match(invalid.stderr, /image must be a public file path/);
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("imported imageAi cannot suppress the derived AI disclosure", () => {
  for (const source of [undefined, "ai"]) {
    const raw = load();
    raw.stores.push(postFixture({ image: raw.stores[0].image, imageAi: false,
      ...(source ? { imageSource: source } : {}) }));
    const post = buildPublicMetro(raw).stores.at(-1);
    assert.equal("imageAi" in post, false);
    assert.equal(footNote(post), "菜圖為 AI 示意，非店家實拍。價格、營業時間可能調整，出發前再確認。");
    assert.match(imageAlt(post), /AI 示意圖/);
  }
});
