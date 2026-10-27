#!/usr/bin/env node
/**
 * Read data/metro.json, drop private keys, snap mapPos to the schematic
 * lines, validate, and write the public payload used by the site.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { STORE_KINDS } from "../lib/metro-logic.mjs";
import { snapToLine } from "./metro-lines.mjs";

const PRIVATE_KEY = "not" + "es";
const PRICE_SOURCE_KEY = "price" + "Source";
const IMAGE_SOURCE_KEY = "image" + "Source";
const IMAGE_SOURCES = new Set(["ai", "founder", "licensed"]);
const GOOGLE_TYPE = "google" + "_reviews";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const srcPath = resolve(root, "data/metro.json");
const outPath = resolve(root, "app/metro/metro.public.json");

const LINE_IDS = new Set(["L_red", "L_blue", "L_green"]);
const PLATFORMS = new Set(["ig", "threads", "xhs"]);
const YMD = /^\d{4}-\d{2}-\d{2}$/;
const SOURCE_HOSTS = new Set(["instagram.com", "www.instagram.com", "threads.com", "www.threads.com"]);

export function isAllowedSourceUrl(url) {
  if (typeof url !== "string" || !url || url.includes("#example")) return false;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  return SOURCE_HOSTS.has(parsed.hostname.toLowerCase());
}

export function fail(msg) {
  throw new Error(`metro schema: ${msg}`);
}

function isReviewVendorType(value) {
  return typeof value === "string" && (value === GOOGLE_TYPE || value.toLowerCase().includes("google"));
}

function stripPrivate(value) {
  if (Array.isArray(value)) return value.map(stripPrivate);
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (k === PRIVATE_KEY) continue;
      out[k] = stripPrivate(v);
    }
    return out;
  }
  return value;
}

function toPublicStores(data) {
  return {
    ...data,
    stores: data.stores.map((store) => {
      const next = { ...store };
      const imageSource = next[IMAGE_SOURCE_KEY];
      delete next[IMAGE_SOURCE_KEY];
      // Public disclosure is derived here; imported flags cannot override provenance.
      delete next.imageAi;
      if (next.kind === "post" && (imageSource === "founder" || imageSource === "licensed")) next.imageAi = false;
      const pending = isReviewVendorType(next[PRICE_SOURCE_KEY]) || (next.kind === "post" && next.priceNT == null);
      delete next[PRICE_SOURCE_KEY];
      if (pending) {
        next.pricePending = true;
        delete next.priceNT;
      }
      return next;
    }),
  };
}

function hasPrivate(value) {
  if (Array.isArray(value)) return value.some(hasPrivate);
  if (value && typeof value === "object") {
    return Object.keys(value).some((k) => k === PRIVATE_KEY || hasPrivate(value[k]));
  }
  return false;
}

function isYmd(v) {
  return typeof v === "string" && YMD.test(v);
}

function validate(data) {
  if (!data || typeof data !== "object") fail("root must be an object");
  if (!data._meta || typeof data._meta !== "object") fail("missing _meta");
  if ("example" in data._meta) fail("_meta.example is retired; mark each store with kind: \"example\" | \"post\"");
  if (!isYmd(data._meta.asOf)) fail("_meta.asOf must be YYYY-MM-DD");
  if (!Array.isArray(data.stations) || data.stations.length < 1) fail("stations must be a non-empty array");
  if (!Array.isArray(data.stores)) fail("stores must be an array");

  const ids = new Set();
  for (const [i, s] of data.stations.entries()) {
    const p = `stations[${i}]`;
    for (const key of ["id", "order", "name", "line", "status", "updatedAt", "mapPos"]) {
      if (!(key in s)) fail(`${p} missing ${key}`);
    }
    if (typeof s.id !== "string" || !s.id) fail(`${p}.id`);
    if (ids.has(s.id)) fail(`duplicate station id ${s.id}`);
    ids.add(s.id);
    if (!Number.isInteger(s.order) || s.order < 1) fail(`${p}.order`);
    if (typeof s.name !== "string" || !s.name) fail(`${p}.name`);
    if (typeof s.line !== "string" || !s.line) fail(`${p}.line`);
    if (s.status !== "live" && s.status !== "coming_soon") fail(`${p}.status`);
    if (s.updatedAt !== null && !isYmd(s.updatedAt)) fail(`${p}.updatedAt`);
    if (s.status === "coming_soon" && s.updatedAt !== null) fail(`${p} coming_soon must have null updatedAt`);
    if (s.status === "live" && !s.updatedAt) fail(`${p} live station needs updatedAt`);
    if (!s.mapPos || !LINE_IDS.has(s.mapPos.line)) fail(`${p}.mapPos.line`);
    if (
      !Array.isArray(s.mapPos.at) ||
      s.mapPos.at.length !== 2 ||
      !s.mapPos.at.every((n) => typeof n === "number" && Number.isFinite(n))
    ) {
      fail(`${p}.mapPos.at must be [number, number]`);
    }
  }

  const storeIds = new Set();
  for (const [i, s] of data.stores.entries()) {
    const p = `stores[${i}]`;
    if (!STORE_KINDS.includes(s.kind)) fail(`${p}.kind must be one of ${STORE_KINDS.join(", ")}`);
    const isPost = s.kind === "post";
    // example entries keep the full legacy field set; post entries need only identity + source + date,
    // and carry no price (shown as 價格待查), so everything else is optional-but-typed.
    for (const key of isPost
      ? ["id", "stationId", "name", "sourcePosts", "addedAt", "verified"]
      : [
          "id",
          "stationId",
          "name",
          "dish",
          "priceNT",
          "priceFrom",
          "priceSource",
          "priceCheckedAt",
          "exit",
          "exitWalkMin",
          "area",
          "hours",
          "image",
          "sourcePosts",
          "addedAt",
          "verified",
        ]) {
      if (!(key in s)) fail(`${p} missing ${key}`);
    }
    if (typeof s.id !== "string" || !s.id) fail(`${p}.id`);
    if (storeIds.has(s.id)) fail(`duplicate store id ${s.id}`);
    storeIds.add(s.id);
    if (!ids.has(s.stationId)) fail(`${p}.stationId ${s.stationId} is not a station`);
    if (typeof s.name !== "string" || !s.name) fail(`${p}.name`);
    if ((!isPost || "dish" in s) && (typeof s.dish !== "string" || !s.dish)) fail(`${p}.dish`);
    if (isPost) {
      if (s.priceNT != null) fail(`${p}.priceNT must be null/absent for kind=post (price shows as 價格待查)`);
      if ("priceFrom" in s && typeof s.priceFrom !== "boolean") fail(`${p}.priceFrom`);
      if (PRICE_SOURCE_KEY in s) fail(`${p} kind=post must not carry a price source`);
      if (s.priceCheckedAt != null) fail(`${p}.priceCheckedAt must be absent for kind=post`);
      if (s.pricePending !== undefined && s.pricePending !== true) fail(`${p}.pricePending must be true for kind=post`);
      if (s.verified !== false) fail(`${p}.verified must be false for kind=post`);
      if (IMAGE_SOURCE_KEY in s && !IMAGE_SOURCES.has(s[IMAGE_SOURCE_KEY])) fail(`${p} image source must be ai | founder | licensed`);
    } else {
      if (typeof s.priceNT !== "number" || s.priceNT < 0) fail(`${p}.priceNT`);
      if (typeof s.priceFrom !== "boolean") fail(`${p}.priceFrom`);
      if (typeof s.priceSource !== "string") fail(`${p}.priceSource`);
    }
    if (s.priceCheckedAt != null && !isYmd(s.priceCheckedAt)) fail(`${p}.priceCheckedAt`);
    if (s.exit != null && typeof s.exit !== "string") fail(`${p}.exit`);
    if (isPost) {
      if (s.exitWalkMin != null && (typeof s.exitWalkMin !== "number" || s.exitWalkMin < 0)) fail(`${p}.exitWalkMin`);
    } else if (typeof s.exitWalkMin !== "number" || s.exitWalkMin < 0) {
      fail(`${p}.exitWalkMin`);
    }
    if ((!isPost || "image" in s) && typeof s.image !== "string") fail(`${p}.image`);
    if (s.image && (s.image.startsWith("data:") || s.image.includes("base64"))) {
      fail(`${p}.image must be a file path, not an inlined image`);
    }
    if (!Array.isArray(s.sourcePosts) || s.sourcePosts.length < 1) fail(`${p}.sourcePosts`);
    for (const post of s.sourcePosts) {
      if (!PLATFORMS.has(post.platform)) fail(`${p} bad source platform`);
      if (typeof post.url !== "string" || !post.url) fail(`${p} source url`);
      if (post.url.includes("#example")) fail(`${p} source url must not be a placeholder`);
      if (!isAllowedSourceUrl(post.url)) fail(`${p} source url must be https on instagram.com or threads.com`);
      if (!isYmd(post.date)) fail(`${p} source date`);
    }
    if (!isYmd(s.addedAt)) fail(`${p}.addedAt`);
    if (!isPost && typeof s.verified !== "boolean") fail(`${p}.verified`);
  }
}

export function buildPublicMetro(raw) {
  const stripped = stripPrivate(raw);
  if (hasPrivate(stripped)) fail("private field survived strip");
  validate(stripped);
  const publicData = toPublicStores(stripped);
  for (const station of publicData.stations) {
    station.mapPos = {
      line: station.mapPos.line,
      at: station.mapPos.at,
      snapped: snapToLine(station.mapPos.line, station.mapPos.at),
    };
  }
  const text = JSON.stringify(publicData);
  if (text.includes(`"${PRIVATE_KEY}"`)) fail("serialized output still contains a private field");
  if (text.includes("#example")) fail("serialized output still contains #example");
  if (text.includes(PRICE_SOURCE_KEY)) fail("price source field leaked into public output");
  if (/google/i.test(text)) fail("vendor name leaked into public output");
  return publicData;
}

function main() {
  try {
    const raw = JSON.parse(readFileSync(srcPath, "utf8"));
    const publicData = buildPublicMetro(raw);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, `${JSON.stringify(publicData, null, 2)}\n`, "utf8");
    console.log(
      `metro public ok: ${publicData.stations.length} stations, ${publicData.stores.length} stores → ${outPath}`,
    );
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
