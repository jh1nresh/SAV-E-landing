import type { FoodStation } from "../../lib/metro";
import shanghaiLines from "../../content/metro/shanghai-lines.json";

type ShanghaiLine = { name_en: string; color: string; d: string };

/** Crop the schematic to the published pins so they sit in the first screen. */
function pinViewBox(x: number, y: number, width: number, height: number, stations: FoodStation[]) {
  const points = stations.map((station) => station.map.snapped ?? station.map.at);
  const xs = points.map((point) => point[0]);
  const ys = points.map((point) => point[1]);
  const minX = Math.min(...xs) - 120;
  const maxX = Math.max(...xs) + 120;
  const minY = Math.min(...ys) - 70;
  const maxY = Math.max(...ys) + 50;
  const left = Math.max(x, minX);
  const top = Math.max(y, minY);
  const right = Math.min(x + width, maxX);
  const bottom = Math.min(y + height, maxY);
  return `${left} ${top} ${right - left} ${bottom - top}`;
}

export function ShanghaiMap({ stations }: { stations: FoodStation[] }) {
  const [x, y, width, height] = shanghaiLines.viewBox;
  const lines = shanghaiLines.lines as Record<string, ShanghaiLine>;
  return (
    <div className="sh-mapcard">
      <span className="city-tape" aria-hidden="true" />
      <svg
        className="sh-map"
        viewBox={pinViewBox(x, y, width, height, stations)}
        role="img"
        aria-label="上海地鐵手繪示意地圖。位置為示意，不是精確地理座標。"
      >
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          {Object.entries(lines).map(([id, line]) => (
            <path key={`${id}-halo`} d={line.d} stroke="#fff9eb" strokeWidth="16" />
          ))}
          {Object.entries(lines).map(([id, line]) => (
            <path key={id} id={id} d={line.d} stroke={line.color} strokeWidth="8" />
          ))}
        </g>
        {stations.map((station) => {
          const [px, py] = station.map.snapped ?? station.map.at;
          return (
            <a key={station.slug} href={`#${station.slug}`}>
              <circle
                data-testid={`shanghai-pin-${station.slug}`}
                cx={px}
                cy={py}
                r="9"
                fill="#fff9eb"
                stroke="#2f2e23"
                strokeWidth="2.6"
              />
              <text
                x={px}
                y={py - 18}
                textAnchor="middle"
                fontFamily="PingFang TC, ui-rounded, sans-serif"
                fontSize="22"
                fill="#2f2e23"
                stroke="#fff9eb"
                strokeWidth="5"
                paintOrder="stroke"
              >
                {station.station}
              </text>
            </a>
          );
        })}
      </svg>
      <p className="sh-caption zh">示意，不是精確比例</p>
      <p className="sh-caption en">Schematic, not to scale</p>
    </div>
  );
}
