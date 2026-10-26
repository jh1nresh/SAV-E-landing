/** Hand-drawn schematic line geometry (view units, not geographic). */
export const LINE_PATHS = {
  L_red: "M-30 -150 C 0 -90 28 -40 52 22 C76 56 104 90 128 116 C150 144 168 174 186 200 C206 230 224 250 246 268 C268 288 284 296 300 302 C324 312 342 340 360 382 C 376 430 392 520 420 770",
  L_blue:
    "M-150 194 C -100 198 -40 200 18 200 C80 202 140 200 186 200 C250 200 330 222 410 244 C470 260 520 274 560 276 C590 278 612 284 634 292 C 700 300 780 320 850 342",
  L_green:
    "M860 22 C 800 46 700 72 598 86 C560 106 510 126 440 142 C380 156 316 192 278 238 C262 258 254 262 246 268 C228 286 214 318 202 382 C 196 440 188 540 176 770",
};

function cubic(p0, p1, p2, p3, t) {
  const u = 1 - t;
  const uu = u * u;
  const uuu = uu * u;
  const tt = t * t;
  const ttt = tt * t;
  return [
    uuu * p0[0] + 3 * uu * t * p1[0] + 3 * u * tt * p2[0] + ttt * p3[0],
    uuu * p0[1] + 3 * uu * t * p1[1] + 3 * u * tt * p2[1] + ttt * p3[1],
  ];
}

function tokenize(d) {
  return d
    .replace(/,/g, " ")
    .replace(/([MLC])/gi, " $1 ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

export function samplePath(d, step = 0.01) {
  const tokens = tokenize(d);
  const points = [];
  let i = 0;
  let current = [0, 0];
  while (i < tokens.length) {
    const cmd = tokens[i++];
    if (cmd === "M" || cmd === "m") {
      current = [Number(tokens[i++]), Number(tokens[i++])];
      points.push(current);
    } else if (cmd === "C" || cmd === "c") {
      while (i + 5 < tokens.length && !/^[MLC]$/i.test(tokens[i])) {
        const p1 = [Number(tokens[i++]), Number(tokens[i++])];
        const p2 = [Number(tokens[i++]), Number(tokens[i++])];
        const p3 = [Number(tokens[i++]), Number(tokens[i++])];
        for (let t = step; t <= 1.0001; t += step) {
          points.push(cubic(current, p1, p2, p3, Math.min(1, t)));
        }
        current = p3;
      }
    } else {
      throw new Error(`Unsupported path command: ${cmd}`);
    }
  }
  return points;
}

const CACHE = new Map();

export function snapToLine(lineId, at) {
  const d = LINE_PATHS[lineId];
  if (!d) throw new Error(`Unknown metro line id: ${lineId}`);
  let pts = CACHE.get(lineId);
  if (!pts) {
    pts = samplePath(d, 0.008);
    CACHE.set(lineId, pts);
  }
  let best = pts[0];
  let bestD = Infinity;
  for (const p of pts) {
    const dx = p[0] - at[0];
    const dy = p[1] - at[1];
    const dist = dx * dx + dy * dy;
    if (dist < bestD) {
      bestD = dist;
      best = p;
    }
  }
  return [Math.round(best[0] * 100) / 100, Math.round(best[1] * 100) / 100];
}
