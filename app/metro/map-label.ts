import type { MetroStation } from "../../lib/metro";

/** Shared schematic label placement for the poster and interactive map. */
export function stationLabelPosition(map: MetroStation["mapPos"], surface: "map" | "poster" = "map") {
  const [x, y] = map.snapped ?? map.at;
  const [dx, dy] = (surface === "poster" ? map.posterLabelOffset ?? map.labelOffset : map.labelOffset) ?? [0, 0];
  return {
    x: x + (map.label === "right" ? 14 : map.label === "left" ? -14 : 0) + dx,
    y: y + (map.label ? 5 : 27) + dy,
    anchor: (map.label === "right" ? "start" : map.label === "left" ? "end" : "middle") as "start" | "end" | "middle",
  };
}

export type Box = { x: number; y: number; width: number; height: number };
type PhotoPoint = { id: string; x: number; y: number; diameter: number };
type CirclePoint = { id: string; homeX: number; homeY: number; r: number };

const intersects = (a: Box, b: Box) => a.x < b.x + b.width && a.x + a.width > b.x &&
  a.y < b.y + b.height && a.y + a.height > b.y;

const overlapArea = (a: Box, b: Box) => {
  const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
};

const photoOffsets: { dx: number; dy: number }[] = [];
for (let dx = -160; dx <= 160; dx += 8) {
  for (let dy = -160; dy <= 160; dy += 8) photoOffsets.push({ dx, dy });
}
photoOffsets.sort((a, b) => (a.dx * a.dx + a.dy * a.dy) - (b.dx * b.dx + b.dy * b.dy));

const circleOffsets: { dx: number; dy: number }[] = [];
for (let dx = -140; dx <= 140; dx += 4) {
  for (let dy = -140; dy <= 140; dy += 4) circleOffsets.push({ dx, dy });
}
circleOffsets.sort((a, b) => (a.dx * a.dx + a.dy * a.dy) - (b.dx * b.dx + b.dy * b.dy));

/** Keep each photo and its touch target clear of labels and other photos at the current zoom. */
export function layoutPhotoPins(points: PhotoPoint[], labels: Box[], width: number, height: number) {
  const placed: Box[] = [];
  const result = new Map<string, { x: number; y: number }>();
  for (const point of [...points].sort((a, b) => a.y - b.y || a.x - b.x)) {
    // Offscreen stations stay offscreen while panning/zooming.
    if (point.x < 0 || point.x > width || point.y < 0 || point.y > height) {
      result.set(point.id, point);
      continue;
    }
    const d = point.diameter;
    const boxAt = (x: number, y: number): Box => ({
      x: x - Math.max(24, d / 2 + 4),
      y: y - d - 12,
      width: Math.max(48, d + 8),
      height: d + 24,
    });
    const fullyInside = (box: Box) => box.x >= 5 && box.y >= 5 && box.x + box.width <= width - 5 && box.y + box.height <= height - 5;
    // The hit is top:-54, height 62. A clipped hit makes scrollIntoView pan the map and steals the centre.
    const hitInside = (x: number, y: number) =>
      x - 23 >= 2 && y - 54 >= 2 && x + 23 <= width - 2 && y + 8 <= height - 2;
    let chosen: { x: number; y: number; box: Box } | null = null;
    for (const { dx, dy } of photoOffsets) {
      const x = point.x + dx;
      const y = point.y + dy;
      const box = boxAt(x, y);
      if (!fullyInside(box)) continue;
      if ([...labels, ...placed].some(other => intersects(box, other))) continue;
      chosen = { x, y, box };
      break;
    }
    // Edge stations have no fully interior slot. Keep the hit
    // centre on the map and take the nearest clear or least-overlapping box
    // so a missed search cannot sit on a label and hide from later pins.
    if (!chosen) {
      let best: { x: number; y: number; box: Box; cost: number; outside: number; dist: number } | null = null;
      for (const { dx, dy } of photoOffsets) {
        const x = point.x + dx;
        const y = point.y + dy;
        if (!hitInside(x, y)) continue;
        const box = boxAt(x, y);
        const cost = [...labels, ...placed].reduce((sum, other) => sum + overlapArea(box, other), 0);
        const outside = fullyInside(box) ? 0 : 1;
        const dist = dx * dx + dy * dy;
        const clearer = !best
          || (cost === 0 && best.cost !== 0)
          || (cost === 0) === (best.cost === 0) && outside < best.outside
          || (cost === 0) === (best.cost === 0) && outside === best.outside && cost < best.cost
          || (cost === 0) === (best.cost === 0) && outside === best.outside && cost === best.cost && dist < best.dist;
        if (clearer) best = { x, y, box, cost, outside, dist };
        if (cost === 0 && outside === 0) break;
      }
      if (best) chosen = best;
    }
    if (chosen) {
      result.set(point.id, { x: chosen.x, y: chosen.y });
      placed.push(chosen.box);
    } else {
      result.set(point.id, point);
      placed.push(boxAt(point.x, point.y));
    }
  }
  return result;
}

/** Move a label box, in the same pixel space, until it clears obstacles and stays on the map. */
export function nudgeBoxClear(box: Box, obstacles: Box[], width: number, height: number) {
  const inside = (b: Box) => b.x >= 1 && b.y >= 1 && b.x + b.width <= width - 1 && b.y + b.height <= height - 1;
  const blocked = (b: Box) => obstacles.some(other => intersects(b, other));
  if (inside(box) && !blocked(box)) return { dx: 0, dy: 0 };
  for (let radius = 2; radius <= 72; radius += 2) {
    for (const [dx, dy] of [[0, -radius], [0, radius], [radius, 0], [-radius, 0], [radius, -radius], [-radius, -radius], [radius, radius], [-radius, radius]] as const) {
      const next = { x: box.x + dx, y: box.y + dy, width: box.width, height: box.height };
      if (inside(next) && !blocked(next)) return { dx, dy };
    }
  }
  return { dx: 0, dy: 0 };
}

/** Approximate a poster label's glyph box. Iansui CJK at 15px is about 13 units wide. */
export function posterLabelBox(name: string, map: MetroStation["mapPos"]): Box {
  const label = stationLabelPosition(map, "poster");
  const width = [...name].length * 13;
  const height = 15;
  const x = label.x - (label.anchor === "end" ? width : label.anchor === "middle" ? width / 2 : 0);
  return { x: x - 1, y: label.y - 14, width: width + 2, height };
}

/** Place poster photo circles near their stations without covering labels or each other. */
export function layoutPosterPhotos(points: CirclePoint[], obstacles: Box[]) {
  const placed: Box[] = [];
  const result = new Map<string, { x: number; y: number }>();
  for (const point of [...points].sort((a, b) => a.homeY - b.homeY || a.homeX - b.homeX)) {
    const boxAt = (x: number, y: number): Box => ({
      x: x - point.r, y: y - point.r, width: point.r * 2, height: point.r * 2,
    });
    let chosen: { x: number; y: number; box: Box } | null = null;
    let best: { x: number; y: number; box: Box; cost: number; dist: number } | null = null;
    for (const { dx, dy } of circleOffsets) {
      const x = point.homeX + dx;
      const y = point.homeY + dy;
      const box = boxAt(x, y);
      const cost = [...obstacles, ...placed].reduce((sum, other) => sum + overlapArea(box, other), 0);
      const dist = dx * dx + dy * dy;
      if (cost === 0) {
        chosen = { x, y, box };
        break;
      }
      if (!best || cost < best.cost || (cost === best.cost && dist < best.dist)) best = { x, y, box, cost, dist };
    }
    const pick = chosen ?? best ?? { x: point.homeX, y: point.homeY, box: boxAt(point.homeX, point.homeY) };
    result.set(point.id, { x: pick.x, y: pick.y });
    placed.push(pick.box);
  }
  return result;
}
