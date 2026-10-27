import { readFileSync } from "node:fs";
import { brotliDecompressSync } from "node:zlib";

function u16(buf, off) {
  return buf.readUInt16BE(off);
}
function u32(buf, off) {
  return buf.readUInt32BE(off);
}

// WOFF2 known-table tags by flag index (W3C WOFF2 spec, section 5.1); only the
// transform rules below matter for finding `cmap` in the decompressed stream.
const WOFF2_TAGS = [
  "cmap", "head", "hhea", "hmtx", "maxp", "name", "OS/2", "post", "cvt ", "fpgm",
  "glyf", "loca", "prep", "CFF ", "VORG", "EBDT", "EBLC", "gasp", "hdmx", "kern",
  "LTSH", "PCLT", "VDMX", "vhea", "vmtx", "BASE", "GDEF", "GPOS", "GSUB", "EBSC",
  "JSTF", "MATH", "CBDT", "CBLC", "COLR", "CPAL", "SVG ", "sbix", "acnt", "avar",
  "bdat", "bloc", "bsln", "cvar", "fdsc", "feat", "fmtx", "fvar", "gvar", "hsty",
  "just", "lcar", "mort", "morx", "opbd", "prop", "trak", "Zapf", "Silf", "Glat",
  "Gloc", "Feat", "Sill",
];

function readBase128(buf, pos) {
  let value = 0;
  for (let i = 0; i < 5; i++) {
    const b = buf[pos.off++];
    value = value * 128 + (b & 0x7f);
    if (!(b & 0x80)) return value;
  }
  throw new Error("bad UIntBase128");
}

// Returns { cmap: Buffer } for a plain sfnt (TTF/OTF) or a WOFF2 container.
// `cmap` is never transformed in WOFF2, so its bytes equal the sfnt cmap table.
function readCmapTable(buf) {
  const magic = buf.toString("ascii", 0, 4);
  if (magic === "wOF2") {
    const numTables = u16(buf, 12);
    const totalCompressed = u32(buf, 20);
    const pos = { off: 48 };
    const tables = [];
    for (let i = 0; i < numTables; i++) {
      const flags = buf[pos.off++];
      const idx = flags & 0x3f;
      const version = flags >> 6;
      const tag = idx === 63 ? buf.toString("ascii", pos.off, (pos.off += 4)) : WOFF2_TAGS[idx];
      const origLength = readBase128(buf, pos);
      const transformed = tag === "glyf" || tag === "loca" ? version === 0 : version !== 0;
      const length = transformed ? readBase128(buf, pos) : origLength;
      tables.push({ tag, length });
    }
    const raw = brotliDecompressSync(buf.subarray(pos.off, pos.off + totalCompressed));
    let off = 0;
    for (const t of tables) {
      if (t.tag === "cmap") return raw.subarray(off, off + t.length);
      off += t.length;
    }
    throw new Error("no cmap");
  }
  const numTables = u16(buf, 4);
  for (let i = 0; i < numTables; i++) {
    const rec = 12 + i * 16;
    if (buf.toString("ascii", rec, rec + 4) === "cmap") {
      const o = u32(buf, rec + 8);
      return buf.subarray(o, o + u32(buf, rec + 12));
    }
  }
  throw new Error("no cmap");
}

// Reads the Unicode cmap of a .ttf or .woff2 file (name kept for importers).
export function ttfCmapCodepoints(path) {
  const buf = readCmapTable(readFileSync(path));
  const cmapOff = 0;
  const num = u16(buf, cmapOff + 2);
  const cps = new Set();
  for (let i = 0; i < num; i++) {
    const rec = cmapOff + 4 + i * 8;
    const platform = u16(buf, rec);
    const encoding = u16(buf, rec + 2);
    const offset = cmapOff + u32(buf, rec + 4);
    if (!((platform === 0 && encoding === 3) || (platform === 3 && encoding === 1) || (platform === 3 && encoding === 10))) {
      continue;
    }
    const format = u16(buf, offset);
    if (format === 4) {
      const segCount = u16(buf, offset + 6) / 2;
      const endOff = offset + 14;
      const startOff = endOff + segCount * 2 + 2;
      const deltaOff = startOff + segCount * 2;
      const rangeOff = deltaOff + segCount * 2;
      for (let s = 0; s < segCount; s++) {
        const end = u16(buf, endOff + s * 2);
        const start = u16(buf, startOff + s * 2);
        const delta = buf.readInt16BE(deltaOff + s * 2);
        const range = u16(buf, rangeOff + s * 2);
        for (let c = start; c <= end; c++) {
          let glyph;
          if (range === 0) glyph = (c + delta) & 0xffff;
          else {
            const ro = rangeOff + s * 2 + range + (c - start) * 2;
            const g = u16(buf, ro);
            glyph = g === 0 ? 0 : (g + delta) & 0xffff;
          }
          if (glyph) cps.add(c);
        }
      }
    } else if (format === 12) {
      const nGroups = u32(buf, offset + 12);
      let p = offset + 16;
      for (let g = 0; g < nGroups; g++) {
        const start = u32(buf, p);
        const end = u32(buf, p + 4);
        p += 12;
        for (let c = start; c <= end; c++) cps.add(c);
      }
    }
  }
  return cps;
}
