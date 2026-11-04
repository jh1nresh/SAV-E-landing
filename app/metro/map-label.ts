import type { MetroStation } from "../../lib/metro";

/** Shared schematic label placement for the poster and interactive map. */
export function stationLabelPosition(map: MetroStation["mapPos"]) {
  const [x, y] = map.snapped ?? map.at;
  const [dx, dy] = map.labelOffset ?? [0, 0];
  return {
    x: x + (map.label === "right" ? 14 : map.label === "left" ? -14 : 0) + dx,
    y: y + (map.label ? 5 : 27) + dy,
    anchor: (map.label === "right" ? "start" : map.label === "left" ? "end" : "middle") as "start" | "end" | "middle",
  };
}
