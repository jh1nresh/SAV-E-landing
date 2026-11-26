"use client";

import { useState } from "react";

type StationCard = {
  slug: string;
  name: string;
  cover?: string;
  intro: string;
  lines: string[];
  meals?: string[];
  scenes?: string[];
};

type City = { id: string; name: string; stations: StationCard[] };

export default function MetroGuideDirectory({ cities }: { cities: City[] }) {
  const [line, setLine] = useState("");
  const [meal, setMeal] = useState("");
  const [scene, setScene] = useState("");
  const stations = cities.flatMap(city => city.stations);
  const options = (key: "lines" | "meals" | "scenes") => [...new Set(stations.flatMap(station => station[key] ?? []))];
  const results = cities.map(city => ({
    ...city,
    stations: city.stations.filter(station =>
      (!line || station.lines.includes(line))
      && (!meal || station.meals?.includes(meal))
      && (!scene || station.scenes?.includes(scene))),
  }));
  const count = results.reduce((sum, city) => sum + city.stations.length, 0);
  const filtered = Boolean(line || meal || scene);

  return <>
    <fieldset className="food-filters">
      <legend>篩選攻略</legend>
      <div>
        <label>捷運路線<select value={line} onChange={event => setLine(event.target.value)}>
          <option value="">全部路線</option>{options("lines").map(value => <option key={value}>{value}</option>)}
        </select></label>
        <label>用餐時段<select value={meal} onChange={event => setMeal(event.target.value)}>
          <option value="">全部時段</option>{options("meals").map(value => <option key={value}>{value}</option>)}
        </select></label>
        <label>用餐情境<select value={scene} onChange={event => setScene(event.target.value)}>
          <option value="">全部情境</option>{options("scenes").map(value => <option key={value}>{value}</option>)}
        </select></label>
        {filtered && <button type="button" onClick={() => { setLine(""); setMeal(""); setScene(""); }}>清除篩選</button>}
      </div>
      <p className="guide-small">時段與情境依攻略標記，出發前請確認店家的當日營業時間。</p>
      <p role="status">{count ? `找到 ${count} 站` : "沒有符合的攻略。試著清除一項條件。"}</p>
    </fieldset>
    {results.map(city => <section className="food-city-section" id={city.id} key={city.id} aria-labelledby={`${city.id}-title`}>
      <h2 id={`${city.id}-title`}>{city.name}</h2>
      <p>{city.stations.length ? `${city.stations.length} 站` : "這個城市目前沒有符合的攻略。"}</p>
      <div className="guide-grid">{city.stations.map(station => <a className="guide-card" href={`/metro/${station.slug}`} key={station.slug}>
        {station.cover && <img className="food-cover" src={station.cover} alt="" width={1080} height={1350} loading="lazy" />}
        {station.lines.length > 0 && <span className="food-lines">{station.lines.join(" · ")}</span>}
        <h3>{station.name}</h3>
        <p>{station.intro}</p>
        <span className="guide-read">看這一站的攻略 →</span>
      </a>)}</div>
    </section>)}
  </>;
}
