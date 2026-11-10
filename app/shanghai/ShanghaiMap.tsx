import type { FoodStation } from "../../lib/metro";
import shanghaiLines from "../../content/metro/shanghai-lines.json";

type ShanghaiLine = { name_en: string; color: string; d: string };

export function ShanghaiMap({ stations }: { stations: FoodStation[] }) {
  const [x, y, width, height] = shanghaiLines.viewBox;
  const lines = shanghaiLines.lines as Record<string, ShanghaiLine>;
  return (
    <div className="sh-mapcard">
      <span className="city-tape" aria-hidden="true" />
      <svg
        className="sh-map"
        viewBox={`${x} ${y} ${width} ${height}`}
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
