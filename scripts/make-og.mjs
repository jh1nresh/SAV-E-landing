#!/usr/bin/env node
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

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

const w = 1200;
const h = 630;
const rows = [];
for (let y = 0; y < h; y++) {
  const row = Buffer.alloc(1 + w * 3);
  for (let x = 0; x < w; x++) {
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
ihdr.writeUInt32BE(w, 0);
ihdr.writeUInt32BE(h, 4);
ihdr[8] = 8;
ihdr[9] = 2;
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(Buffer.concat(rows))),
  chunk("IEND", Buffer.alloc(0)),
]);
writeFileSync("public/og.png", png);
console.log("wrote public/og.png", png.length);
