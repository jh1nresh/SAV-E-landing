#!/usr/bin/env python3
"""Compare two font files (ttf/woff2): every cmap entry, every glyph outline
(coordinates, flags, contour ends, instructions, components), hmtx/vmtx advances,
and the raw bytes of all other tables except `glyf`/`loca`/`post`.

Usage: python3 scripts/compare-fonts.py BASE.ttf NEW.woff2 [--allow-extra-codepoints]
Exit 0 only if every glyph reachable in BASE is identical in NEW.
Requires: pip install fonttools brotli
"""
import sys
from fontTools.ttLib import TTFont

args = [a for a in sys.argv[1:] if not a.startswith("--")]
allow_extra = "--allow-extra-codepoints" in sys.argv
base, new = TTFont(args[0]), TTFont(args[1])
problems = []

def glyph_sig(font, name):
    g = font["glyf"][name]
    if g.isComposite():
        comps = [(c.glyphName, c.x, c.y, c.flags, getattr(c, "transform", None)) for c in g.components]
        return ("composite", comps)
    coords, ends, flags = g.getCoordinates(font["glyf"])
    prog = getattr(g, "program", None)
    return ("simple", list(coords), list(ends), list(flags), prog.getBytecode() if prog else b"")

# cmap: all unicode subtables, codepoint -> glyph NAME (names may legitimately
# differ if post names are dropped, so also compare outlines via the name map).
for sub_b in base["cmap"].tables:
    sub_n = [t for t in new["cmap"].tables if (t.platformID, t.platEncID) == (sub_b.platformID, sub_b.platEncID)]
    if not sub_n:
        problems.append(f"cmap subtable {(sub_b.platformID, sub_b.platEncID)} missing")
        continue
    nb, nn = sub_b.cmap, sub_n[0].cmap
    miss = [hex(c) for c in nb if c not in nn]
    extra = [hex(c) for c in nn if c not in nb]
    if miss: problems.append(f"cmap {sub_b.platformID}/{sub_b.platEncID}: {len(miss)} codepoints missing, e.g. {miss[:5]}")
    if extra and not allow_extra: problems.append(f"cmap: {len(extra)} extra codepoints, e.g. {extra[:5]}")

order_b, order_n = base.getGlyphOrder(), new.getGlyphOrder()
if len(order_b) != len(order_n):
    problems.append(f"glyph count {len(order_b)} vs {len(order_n)}")
# glyph ids must line up (cmap -> gid -> outline); compare by gid
nout = nadv = 0
for gid, (nb, nn) in enumerate(zip(order_b, order_n)):
    if glyph_sig(base, nb) != glyph_sig(new, nn):
        nout += 1
        if nout <= 5: problems.append(f"outline differs at gid {gid} ({nb}/{nn})")
    for tag in ("hmtx", "vmtx"):
        if tag in base and base[tag].metrics[nb] != new[tag].metrics[nn]:
            nadv += 1
            if nadv <= 5: problems.append(f"{tag} differs at gid {gid}: {base[tag].metrics[nb]} vs {new[tag].metrics[nn]}")
for tag in sorted(set(base.keys()) | set(new.keys())):
    if tag in ("GlyphOrder", "glyf", "loca", "post", "hmtx", "vmtx"): continue
    if tag not in base or tag not in new:
        problems.append(f"table {tag} only in one font")
    elif tag == "head":
        # WOFF2 conversion legitimately changes only checkSumAdjustment, `modified`
        # and head.flags bit 11 ("lossless transformed font data", set by the spec).
        skip = {"checkSumAdjustment", "modified"}
        hb, hn = base["head"].__dict__, new["head"].__dict__
        d = [k for k in hb if k not in skip and k != "flags" and hb[k] != hn.get(k)]
        if (hb["flags"] & ~0x0800) != (hn["flags"] & ~0x0800): d.append("flags")
        if d: problems.append(f"head fields differ: {d}")
    elif base.getTableData(tag) != new.getTableData(tag):
        problems.append(f"table {tag} bytes differ")
# cmap -> gid mapping must be the same gid in both fonts
cb = base.getBestCmap(); cn = new.getBestCmap()
bad = [hex(c) for c in cb if c in cn and base.getGlyphID(cb[c]) != new.getGlyphID(cn[c])]
if bad: problems.append(f"{len(bad)} codepoints map to a different glyph id, e.g. {bad[:5]}")
print(f"codepoints base={len(cb)} new={len(cn)}  glyphs base={len(order_b)} new={len(order_n)}  outline diffs={nout}  advance diffs={nadv}")
print("tables base:", sorted(k for k in base.keys() if k != "GlyphOrder"))
print("tables new :", sorted(k for k in new.keys() if k != "GlyphOrder"))
if problems:
    print("DIFFERENCES:"); [print(" -", p) for p in problems]; sys.exit(1)
print("IDENTICAL: cmap, outlines, advances, and all other compared tables")
