#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const PRIVATE_KEY = "not" + "es";
const root = process.cwd();

const pub = JSON.parse(readFileSync(join(root, "app/metro/metro.public.json"), "utf8"));
const pubText = JSON.stringify(pub);
if (pubText.includes(`"${PRIVATE_KEY}"`)) {
  console.error("metro.public.json contains a private field");
  process.exit(1);
}
if (/google/i.test(pubText) || pubText.includes("priceSource")) {
  console.error("metro.public.json leaked a private price source");
  process.exit(1);
}

for (const store of pub.stores) {
  if (store.pricePending) {
    if (store.priceNT != null) {
      console.error("pending-price store still has a number", store.id);
      process.exit(1);
    }
  } else if (typeof store.priceNT !== "number") {
    console.error("live-price store missing priceNT", store.id);
    process.exit(1);
  }
  if (!store.image.startsWith("/assets/food/") || store.image.startsWith("data:")) {
    console.error("store image must be a public file path:", store.id, store.image);
    process.exit(1);
  }
  const file = join(root, "public", store.image);
  if (!existsSync(file)) {
    console.error("missing food image", store.image);
    process.exit(1);
  }
}

function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

if (existsSync(join(root, ".next"))) {
  const htmlFiles = walk(join(root, ".next")).filter((f) => f.endsWith(".html"));
  for (const file of htmlFiles) {
    const text = readFileSync(file, "utf8");
    if (text.includes("data:image")) {
      console.error("inlined base64 image in", file);
      process.exit(1);
    }
    if (text.length >= 500 * 1024) {
      console.error(`HTML ${file} is ${text.length} bytes (>= 500 KB)`);
      process.exit(1);
    }
  }
}

console.log("check-output: ok");
