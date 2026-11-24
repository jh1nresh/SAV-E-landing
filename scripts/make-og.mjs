#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;
const MAX_PIXELS = 2_000_000;

function crc(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([t, data]);
  const c = Buffer.alloc(4);
  c.writeUInt32BE(crc(body));
  return Buffer.concat([len, body, c]);
}

export function buildOgPng(width = OG_WIDTH, height = OG_HEIGHT) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width * height > MAX_PIXELS) {
    throw new Error(`og image size out of bounds: ${width}x${height}`);
  }
  const rows = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 3);
    for (let x = 0; x < width; x++) {
      const i = 1 + x * 3;
      if (y < 96) {
        row[i] = 0xf2;
        row[i + 1] = 0x6b;
        row[i + 2] = 0x4a;
      } else {
        row[i] = 0xff;
        row[i + 1] = 0xf9;
        row[i + 2] = 0xeb;
      }
    }
    rows.push(row);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(Buffer.concat(rows))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function isDirectRun() {
  const entry = process.argv[1];
  if (!entry) return false;
  return fileURLToPath(import.meta.url) === resolve(entry);
}

function main() {
  const out = process.argv[2] || "public/og.png";
  console.log(`make-og: start ${out}`);
  const png = buildOgPng();
  writeFileSync(out, png);
  console.log(`wrote ${out}`, png.length);
  // Stop before any statement appended after this call can run.
  process.exit(0);
}

if (isDirectRun()) {
  try {
    main();
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}
