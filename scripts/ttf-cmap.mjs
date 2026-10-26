import { readFileSync } from "node:fs";

function u16(buf, off) {
  return buf.readUInt16BE(off);
}
function u32(buf, off) {
  return buf.readUInt32BE(off);
}

export function ttfCmapCodepoints(path) {
  const buf = readFileSync(path);
  const numTables = u16(buf, 4);
  let cmapOff = 0;
  for (let i = 0; i < numTables; i++) {
    const rec = 12 + i * 16;
    const tag = buf.toString("ascii", rec, rec + 4);
    if (tag === "cmap") {
      cmapOff = u32(buf, rec + 8);
      break;
    }
  }
  if (!cmapOff) throw new Error("no cmap");
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
