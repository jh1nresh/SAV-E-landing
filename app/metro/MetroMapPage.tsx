import { taipeiDate } from "../../lib/metro-logic.mjs";
import { CityHeroMap } from "./CityHeroMap";
import "./hero-map.css";
import "./map-page.css";

export default function MetroMapPage() {
  return (
    <main className="metro-map-page" id="hero">
      <h1 className="zh">捷運美食地圖</h1>
      <h1 className="en">Metro food map</h1>
      <CityHeroMap clock={taipeiDate()} />
      <a className="map-credit" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" data-testid="osm-attribution">
        Map data © OpenStreetMap contributors
      </a>
    </main>
  );
}
