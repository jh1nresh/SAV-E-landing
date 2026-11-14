"use client";

import { getFoodStations, getShanghaiFoodStations, getPublicMetroData, stampLevel, stampNote, stationIsNew } from "../../lib/metro";
import { buildPickerStations, TAIPEI_LINE_COLOR } from "../../lib/station-picker.mjs";
import { TEST_QUERY_HOOKS, type FreshSource } from "../../lib/test-hooks.mjs";
import shanghaiLines from "../../content/metro/shanghai-lines.json";
import { useSiteCity } from "../SiteChrome";
import { StationPicker } from "../station-search/StationPicker";
import { HeroMapLazy } from "./HeroMapLazy";
import { shanghaiMetro } from "./city-map";

const taipei = getPublicMetroData();
const shanghaiFoods = getShanghaiFoodStations();
const shanghai = shanghaiMetro(shanghaiFoods);
const shanghaiColors = Object.fromEntries(Object.entries(shanghaiLines.lines).map(([id, line]) => [id, line.color]));

export function CityHeroMap({ clock }: { clock: string }) {
  const { city } = useSiteCity();
  const metro = city === "shanghai" ? shanghai : taipei;
  const foods = city === "shanghai" ? shanghaiFoods : getFoodStations();
  const stations = buildPickerStations(foods, metro.stations, city === "shanghai" ? shanghaiColors : TAIPEI_LINE_COLOR);
  const freshIds = metro.stations
    .filter((station) => stationIsNew(metro.stores.filter((store) => store.stationId === station.id), clock))
    .map((station) => station.id);
  const freshSources: FreshSource[] | undefined = TEST_QUERY_HOOKS
    ? metro.stations.map((station) => ({
        id: station.id,
        stores: metro.stores.filter((store) => store.stationId === station.id).map((store) => ({
          kind: store.kind,
          backfill: store.backfill,
          addedAt: store.addedAt,
          sourcePosts: store.sourcePosts,
        })),
      }))
    : undefined;
  const note = stampNote(metro.stores);
  const partial = stampLevel(metro.stores) === "partial";

  return <div className="hero-search-col" data-city={city}>
    <StationPicker key={city} stations={stations} city={city} freshIds={freshIds} freshSources={freshSources} note={note} partial={partial} showLineMenu={city === "shanghai"} />
    <HeroMapLazy key={`map-${city}`} data={metro} />
    {city === "shanghai" && <p className="guide-small">
      <span className="zh">價格以人民幣（¥）表示；未提供價格的店家留白。</span>
      <span className="en">Prices are renminbi (¥); unpublished prices stay blank.</span>
    </p>}
    {city === "shanghai" && <noscript>{shanghaiFoods.map(station => <section id={station.slug} key={station.slug}>
      <h2>{station.station}</h2>
      {station.shops.map((shop, i) => <article key={shop.key ?? i}><h3>{shop.name}</h3><p>{shop.address}</p>{shop.price && <p>{shop.price}</p>}</article>)}
      {station.posts.instagram && <a href={station.posts.instagram}>Instagram ↗</a>}
      {station.posts.threads && <a href={station.posts.threads}>Threads ↗</a>}
    </section>)}</noscript>}
  </div>;
}
