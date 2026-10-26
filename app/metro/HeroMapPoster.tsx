import { formatMd, latestUpdatedAt, type MetroData } from "../../lib/metro";
import { useSiteLang } from "../SiteChrome";
import { MapPaper } from "./MapPaper";
import { MAP_SVG, SVG_DEFS } from "./map-svg";

// Keep the existing artwork, but isolate its SVG references from the live map.
const posterSvg = (value: string) => value
  .replace(/id="([^"]+)"/g, 'id="poster-$1"')
  .replace(/url\(#([^)]+)\)/g, 'url(#poster-$1)')
  .replace(/href="#([^"]+)"/g, 'href="#poster-$1"');

export function HeroMapPoster({ data }: { data: MetroData }) {
  const { lang } = useSiteLang();
  const latest = latestUpdatedAt(data);
  const stations = data.stations.slice().sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  return (
    <div className="mapwrap mapwrap-slot" data-testid="metro-map-slot" role="img"
      aria-label={lang === "en" ? "Taipei MRT food map" : "台北捷運美食地圖"}>
      <div aria-hidden="true">
        <div dangerouslySetInnerHTML={{ __html: posterSvg(SVG_DEFS) }} />
        <div className="strip-wrap">
          <div className="strip-label">依最新更新排序</div>
          <div className="strip">
            {stations.map(s => <span className={`tab ${s.status === "coming_soon" ? "soon" : ""}`} key={s.id}>
              {s.name}<i>{s.status === "coming_soon" ? "即將更新" : formatMd(s.updatedAt ?? "")}</i>
            </span>)}
          </div>
        </div>
        <div className="mapcard">
          <MapPaper id="poster-map-paper" />
          <span className="tape a" />
          <div className="stamp"><b>本週新增</b><span>{latest ? `更新於 ${formatMd(latest)}` : ""}</span><i>範例資料 · 示意</i></div>
          <div className="vp poster-vp" data-testid="metro-map-skeleton">
            <div className="poster-world">
              <div dangerouslySetInnerHTML={{ __html: posterSvg(MAP_SVG) }} />
              <svg viewBox="-150 -170 1000 940" className="poster-pins">
                {stations.map(s => {
                  const [x, y] = s.mapPos.snapped ?? s.mapPos.at;
                  const image = data.stores.find(store => store.stationId === s.id)?.image;
                  const soon = s.status === "coming_soon";
                  return <g key={s.id}>
                    <circle cx={x} cy={y} r="7.5" fill="#fff9eb" stroke="#2f2e23" strokeWidth="2.6" />
                    <text x={x} y={y + 27} textAnchor="middle" fontFamily="Iansui" fontSize="15" fill="#2f2e23" stroke="#fff9eb" strokeWidth="4.5" paintOrder="stroke">{s.name}</text>
                    <path d={`M${x-7} ${y-13} L${x} ${y} L${x+7} ${y-13}`} fill="#fff9eb" stroke="#2f2e23" strokeWidth="2" />
                    <circle cx={x} cy={y-36} r="25" fill="#fff9eb" stroke={soon ? "#8d857a" : "#2f2e23"} strokeWidth="2" />
                    {image ? <>
                      <clipPath id={`poster-photo-${s.id}`}><circle cx={x} cy={y-36} r="21" /></clipPath>
                      <image href={image} x={x-21} y={y-57} width="42" height="42" clipPath={`url(#poster-photo-${s.id})`} />
                    </> : <text x={x} y={y-29} textAnchor="middle" fill="#8d857a" fontSize="24">?</text>}
                  </g>;
                })}
              </svg>
            </div>
            <div className="hud hint">點一站，看吃什麼</div>
            <div className="hud cart"><b>Taipei</b><span>捷運口袋名單 · 示意位置</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
