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

type Box = { x: number; y: number; width: number; height: number };
type PhotoPoint = { id: string; x: number; y: number; diameter: number };

const photoOffsets: { dx: number; dy: number }[] = [];
for (let dx = -160; dx <= 160; dx += 8) {
  for (let dy = -160; dy <= 160; dy += 8) photoOffsets.push({ dx, dy });
}
photoOffsets.sort((a, b) => (a.dx * a.dx + a.dy * a.dy) - (b.dx * b.dx + b.dy * b.dy));

/** Keep each photo and its touch target clear of labels and other photos at the current zoom. */
export function layoutPhotoPins(points: PhotoPoint[], labels: Box[], width: number, height: number) {
  const intersects = (a: Box, b: Box) => a.x < b.x + b.width && a.x + a.width > b.x &&
    a.y < b.y + b.height && a.y + a.height > b.y;
  const placed: Box[] = [];
  const result = new Map<string, { x: number; y: number }>();
  for (const point of [...points].sort((a, b) => a.y - b.y || a.x - b.x)) {
    // Offscreen stations stay offscreen while panning/zooming.
    if (point.x < 0 || point.x > width || point.y < 0 || point.y > height) {
      result.set(point.id, point);
      continue;
    }
    const d = point.diameter;
    let position = { x: point.x, y: point.y };
    for (const { dx, dy } of photoOffsets) {
      const x = point.x + dx, y = point.y + dy;
      // Include the 44px hit target, NEW dot, badge and ring, not just the round photo.
      const box = { x: x - Math.max(24, d / 2 + 4), y: y - d - 12, width: Math.max(48, d + 8), height: d + 24 };
      if (box.x < 5 || box.y < 5 || box.x + box.width > width - 5 || box.y + box.height > height - 5) continue;
      if ([...labels, ...placed].some(other => intersects(box, other))) continue;
      position = { x, y };
      placed.push(box);
      break;
    }
    result.set(point.id, position);
  }
  return result;
}
