import assert from "node:assert/strict";
import { test } from "node:test";
import {
  PRICE_PENDING_LABEL,
  daysBetween,
  isNewDate,
  priceIsEstimate,
  priceIsPending,
  resolveClock,
  taipeiDate,
} from "../../lib/metro-logic.mjs";
import { buildPublicMetro } from "../../scripts/build-metro.mjs";
import { readFileSync } from "node:fs";

test("taipeiDate uses Asia/Taipei calendar date", () => {
  const late = new Date("2026-10-26T16:00:00.000Z"); // 00:00 next day in Taipei
  assert.equal(taipeiDate(late), "2026-10-27");
});

test("NEW is strictly less than 7 days: day 6 yes, day 7 and 8 no", () => {
  const added = "2026-10-26";
  assert.equal(daysBetween(added, "2026-11-01"), 6);
  assert.equal(isNewDate(added, "2026-11-01"), true);
  assert.equal(daysBetween(added, "2026-11-02"), 7);
  assert.equal(isNewDate(added, "2026-11-02"), false);
  assert.equal(daysBetween(added, "2026-11-03"), 8);
  assert.equal(isNewDate(added, "2026-11-03"), false);
});

test("price is 示意 unless verified===true and priceCheckedAt is set", () => {
  assert.equal(priceIsEstimate({ verified: false, priceCheckedAt: "2026-10-10" }), true);
  assert.equal(priceIsEstimate({ verified: true, priceCheckedAt: null }), true);
  assert.equal(priceIsEstimate({ verified: true, priceCheckedAt: "2026-10-10" }), false);
});

test("resolveClock prefers injected YYYY-MM-DD", () => {
  assert.equal(resolveClock("2026-11-01"), "2026-11-01");
  assert.equal(resolveClock(new URLSearchParams("clock=2026-11-01")), "2026-11-01");
});

test("build strips private fields, snaps mapPos, keeps public data", () => {
  const raw = JSON.parse(readFileSync("data/metro.json", "utf8"));
  const pub = buildPublicMetro(raw);
  assert.equal("not" + "es" in pub._meta, false);
  assert.ok(!JSON.stringify(pub).includes("INTERNAL_NOTE_MUST_NOT_SHIP"));
  assert.ok(!JSON.stringify(pub).includes(`"${"not" + "es"}"`));
  for (const station of pub.stations) {
    assert.ok(Array.isArray(station.mapPos.snapped));
    assert.equal(station.mapPos.snapped.length, 2);
    assert.ok(station.mapPos.snapped.every((n) => Number.isFinite(n)));
  }
  assert.ok(pub.stores.some((s) => s.name === "珍好鍋貼"));
});

test("schema fails on missing mapPos", () => {
  const raw = JSON.parse(readFileSync("data/metro.json", "utf8"));
  delete raw.stations[0].mapPos;
  assert.throws(() => buildPublicMetro(raw), /mapPos/);
});

test("schema fails on malformed status", () => {
  const raw = JSON.parse(readFileSync("data/metro.json", "utf8"));
  raw.stations[0].status = "draft";
  assert.throws(() => buildPublicMetro(raw), /status/);
});

test("review-vendor shops become pricePending and drop source + number", () => {
  const raw = JSON.parse(readFileSync("data/metro.json", "utf8"));
  const pub = buildPublicMetro(raw);
  const pending = pub.stores.filter((s) => s.pricePending);
  assert.equal(pending.length, 3);
  assert.ok(pending.every((s) => s.priceNT === undefined));
  assert.ok(pending.every((s) => !("priceSource" in s)));
  assert.ok(priceIsPending(pending[0]));
  assert.equal(PRICE_PENDING_LABEL, "價格待查");
  const kept = pub.stores.find((s) => s.id === "houshanpi-1");
  assert.equal(kept.priceNT, 7);
  assert.equal(kept.pricePending, undefined);
  const text = JSON.stringify(pub);
  assert.equal(/google/i.test(text), false);
  assert.equal(text.includes("priceSource"), false);
});

test("schema fails if a private field remains in output", () => {
  const raw = JSON.parse(readFileSync("data/metro.json", "utf8"));
  const pub = buildPublicMetro(raw);
  pub.stations[0]["not" + "es"] = "leak";
  assert.ok(JSON.stringify(pub).includes(`"${"not" + "es"}"`));
});
