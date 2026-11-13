import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/** Hand-drawn schematic line geometry (view units, not geographic). */

export const LINE_PATHS = {
  L_orange: "M52 22 C 38 24 22 27 4 31",
  L_red: "M-30 -150 C 0 -90 28 -40 52 22 C76 56 104 90 128 116 C150 144 168 174 186 200 C206 230 224 250 246 268 C268 288 284 296 300 302 C324 312 342 340 360 382 C 376 430 392 520 420 770",
  L_blue:
    "M-150 194 C -100 198 -40 200 18 200 C80 202 140 200 186 200 C250 200 330 222 410 244 C470 260 520 274 560 276 C590 278 612 284 634 292 C 700 300 780 320 850 342",
  L_green:
    "M860 22 C 800 46 700 72 598 86 C560 106 510 126 440 142 C380 156 316 192 278 238 C262 258 254 262 246 268 C228 286 214 318 202 382 C 196 440 188 540 176 770",
};

/**
 * The inbox workflow checks main out under main/ and runs with cwd at the parent.
 * Repo scripts and Playwright run with cwd at the repository root.
 * Prefer the two-checkout path so a file at the parent cannot shadow main.
 */
function shanghaiLinesPath() {
  const candidates = [
    resolve(process.cwd(), "main/content/metro/shanghai-lines.json"),
    resolve(process.cwd(), "content/metro/shanghai-lines.json"),
  ];
  const found = candidates.find(path => existsSync(path));
  if (!found) throw new Error(`shanghai-lines.json not found. Looked in: ${candidates.join(", ")}`);
  return found;
}

const shanghaiLines = JSON.parse(readFileSync(shanghaiLinesPath(), "utf8"));
/** Shanghai schematic paths. Separate from LINE_PATHS so the Taipei map SVG stays unchanged. */
export const SHANGHAI_LINE_PATHS = Object.fromEntries(Object.entries(shanghaiLines.lines).map(([id, line]) => [id, line.d]));
export const SHANGHAI_VIEWBOX = shanghaiLines.viewBox;

export function linePathsFor(city) {
  switch (city) {
    case "taipei":
      return LINE_PATHS;
    case "shanghai":
      return SHANGHAI_LINE_PATHS;
    default: {
      const unexpected = city;
      throw new Error(`Unknown metro city: ${unexpected}`);
    }
  }
}

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
  const d = LINE_PATHS[lineId] ?? SHANGHAI_LINE_PATHS[lineId];
  if (!d) throw new Error(`Unknown metro line id: ${lineId}`);
  let curves = CACHE.get(lineId);
  if (!curves) {
    const numbers = d.match(/-?\d+(?:\.\d+)?/g).map(Number);
    let current = numbers.splice(0, 2);
    curves = [];
    while (numbers.length) {
      const curve = [current, numbers.splice(0, 2), numbers.splice(0, 2), numbers.splice(0, 2)];
      curves.push(curve);
      current = curve[3];
    }
    CACHE.set(lineId, curves);
  }
  let best;
  let bestD = Infinity;
  for (const curve of curves) {
    const point = t => cubic(...curve, t);
    const distance = t => {
      const p = point(t);
      return (p[0] - at[0]) ** 2 + (p[1] - at[1]) ** 2;
    };
    // Refine every sampled local minimum, including curve endpoints.
    const steps = 125;
    const distances = Array.from({ length: steps + 1 }, (_, i) => distance(i / steps));
    for (let i = 0; i <= steps; i++) {
      if ((i > 0 && distances[i] > distances[i - 1]) || (i < steps && distances[i] > distances[i + 1])) continue;
      let lo = Math.max(0, (i - 1) / steps);
      let hi = Math.min(1, (i + 1) / steps);
      for (let iteration = 0; iteration < 50; iteration++) {
        const left = lo + (hi - lo) / 3;
        const right = hi - (hi - lo) / 3;
        if (distance(left) < distance(right)) hi = right;
        else lo = left;
      }
      for (const t of [i / steps, (lo + hi) / 2]) {
        const dist = distance(t);
        if (dist < bestD) { bestD = dist; best = point(t); }
      }
    }
  }
  return best.map(value => Math.round(value * 100) / 100);
}
