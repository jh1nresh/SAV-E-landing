import { cityMapSvg, cityMapName } from "./city-map";
import { stationLabelPosition, layoutPosterPhotos, posterLabelBox } from "./map-label";
import { type MetroData } from "../../lib/metro";
import { useSiteLang } from "../SiteChrome";
import { MapPaper } from "./MapPaper";
import { SVG_DEFS } from "./map-svg";

// Keep the existing artwork, but isolate its SVG references from the live map.
const posterSvg = (value: string) => value
  .replace(/id="([^"]+)"/g, 'id="poster-$1"')
  .replace(/url\(#([^)]+)\)/g, 'url(#poster-$1)')
  .replace(/href="#([^"]+)"/g, 'href="#poster-$1"');

export function HeroMapPoster({ data }: { data: MetroData }) {
  const { lang } = useSiteLang();
  const stations = data.stations.slice().sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  const pictured = new Set(data.stores.map(store => store.stationId));
  const posterPhotos = layoutPosterPhotos(
    stations.filter(s => pictured.has(s.id)).map(s => {
      const [x, y] = s.mapPos.snapped ?? s.mapPos.at;
      return { id: s.id, homeX: x, homeY: y - 36, r: 26 };
    }),
    stations.map(s => posterLabelBox(s.name, s.mapPos)),
  );
  return (
    <div className="mapwrap mapwrap-slot" data-testid="metro-map-slot" role="img"
      aria-label={lang === "en" ? (data._meta.city === "shanghai" ? "Shanghai metro food map" : "Taipei MRT food map") : `${data._meta.city === "shanghai" ? "上海地鐵" : "台北捷運"}美食地圖`}>
      <div aria-hidden="true">
        <div dangerouslySetInnerHTML={{ __html: posterSvg(SVG_DEFS) }} />
        <div className="mapcard">
          <MapPaper id="poster-map-paper" />
          <span className="tape a" />
          <div className="vp poster-vp" data-testid="metro-map-skeleton">
            <div className="poster-world">
              <div dangerouslySetInnerHTML={{ __html: posterSvg(cityMapSvg(data)) }} />
              <svg viewBox="-150 -170 1000 940" className="poster-pins">
                {stations.map(s => {
                  const [x, y] = s.mapPos.snapped ?? s.mapPos.at;
                  const photoMark = posterPhotos.get(s.id);
                  const parked = !!photoMark && Math.hypot(photoMark.x - x, photoMark.y - (y - 36)) < 0.5;
                  const label = stationLabelPosition(s.mapPos, "poster");
                  const image = data.stores.find(store => store.stationId === s.id)?.image;
                  const soon = s.status === "coming_soon";
                  return <g key={s.id} data-testid={`metro-poster-marker-${s.id}`} data-station={s.name}>
                    <circle cx={x} cy={y} r="7.5" fill="#fff9eb" stroke="#2f2e23" strokeWidth="2.6" />
                    <text data-testid={`metro-poster-label-${s.id}`} x={label.x} y={label.y} textAnchor={label.anchor} fontFamily="Iansui" fontSize="15" fill="#2f2e23" stroke="#fff9eb" strokeWidth="4.5" paintOrder="stroke">{s.name}</text>
                    {photoMark && (parked
                      ? <path d={`M${x - 7} ${y - 13} L${x} ${y} L${x + 7} ${y - 13}`} fill="#fff9eb" stroke="#2f2e23" strokeWidth="2" />
                      : <line x1={photoMark.x} y1={photoMark.y} x2={x} y2={y} stroke="#2f2e23" strokeWidth="1.6" />)}
                    {photoMark && <circle data-testid={`metro-poster-pin-${s.id}`} cx={photoMark.x} cy={photoMark.y} r="25" fill="#fff9eb" stroke={soon ? "#8d857a" : "#2f2e23"} strokeWidth="2" />}
                    {photoMark && (image ? <>
                      <clipPath id={`poster-photo-${s.id}`}><circle cx={photoMark.x} cy={photoMark.y} r="21" /></clipPath>
                      <image href={image} x={photoMark.x - 21} y={photoMark.y - 21} width="42" height="42" clipPath={`url(#poster-photo-${s.id})`} />
                    </> : <text x={photoMark.x} y={photoMark.y + 7} textAnchor="middle" fill="#8d857a" fontSize="24">?</text>)}
                  </g>;
                })}
              </svg>
            </div>
            <div className="hud map-caption-group">
              <div className="hud cart" data-testid="metro-poster-title"><b>{cityMapName(data)}</b><span>捷運口袋名單 · 示意位置</span></div>
              <div className="hud hint">點一站，看吃什麼</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
