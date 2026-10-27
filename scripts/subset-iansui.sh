#!/usr/bin/env bash
# Rebuild public/assets/fonts/Iansui-SavvySubset.ttf with extra characters.
# Usage: scripts/subset-iansui.sh <Iansui-Regular.ttf (v1.012 source)> "<extra chars>"
# See docs/FONT-SUBSET.md. Requires: pip install fonttools
set -euo pipefail
SRC="${1:?path to Iansui-Regular.ttf (ButTaiwan/iansui commit 18aa2c34e, Version 1.012)}"
EXTRA="${2:-}"
OUT="public/assets/fonts/Iansui-SavvySubset.ttf"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
cp "$OUT" "$TMP/current.ttf"
python3 - "$TMP/current.ttf" "$EXTRA" "$TMP/unicodes.txt" <<'PY'
import sys
from fontTools.ttLib import TTFont
cur, extra, out = sys.argv[1:4]
cps = set(TTFont(cur).getBestCmap()) | {ord(c) for c in extra}
open(out, "w").write(",".join(f"U+{c:04X}" for c in sorted(cps)))
print(f"{len(cps)} codepoints")
PY
pyftsubset "$SRC" --unicodes-file="$TMP/unicodes.txt" --layout-features='*' \
  --glyph-names --name-IDs='*' --name-languages=1033 --name-legacy --notdef-outline \
  --output-file="$OUT"
