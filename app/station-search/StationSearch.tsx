"use client";

import { Fragment, useMemo, useState } from "react";
import {
  Combobox,
  ComboboxClear,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxGroupLabel,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxItemText,
  ComboboxLabel,
  ComboboxList,
  ComboboxTrigger,
} from "@ui-sdk/react/combobox";
import {
  Menu,
  MenuContent,
  MenuGroupLabel,
  MenuItemIndicator,
  MenuRadioGroup,
  MenuRadioItem,
  MenuTrigger,
} from "@ui-sdk/react/menu";
import {
  EMPTY_RESULTS,
  announcement,
  filterStations,
  groupLabel,
  lineOptions,
  matchShop,
  resultCountText,
  stationMeta,
  type SearchStation,
} from "../../lib/station-search.mjs";
import "./station-search.css";

function scrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

function openTaipeiStation(id: string) {
  document.querySelector(".map-stage")?.scrollIntoView({ behavior: scrollBehavior(), block: "center" });
  const attempt = (left: number) => {
    const api = window.__savvyMap;
    if (!api) {
      if (left > 0) window.setTimeout(() => attempt(left - 1), 50);
      return;
    }
    const state = api.state();
    if (state.openId === id || state.showing === id) return;
    api.select(id);
  };
  attempt(120);
}

function openShanghaiStation(slug: string) {
  const el = document.getElementById(slug);
  if (!el) return;
  const url = new URL(window.location.href);
  url.hash = slug;
  history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  el.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
}

function LineMenu({ value, options, onChange }: { value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <Menu>
      <MenuTrigger className="chip ss-menu-trigger" aria-label="只看這條線">
        {value === "all" ? "全部路線" : value}
        <span aria-hidden="true" className="ss-caret">▾</span>
      </MenuTrigger>
      <MenuContent sideOffset={8} align="end">
        <MenuRadioGroup value={value} onValueChange={(next) => onChange(next)}>
          <MenuGroupLabel>只看這條線</MenuGroupLabel>
          <MenuRadioItem value="all" closeOnSelect>
            <MenuItemIndicator>●</MenuItemIndicator>
            全部路線
          </MenuRadioItem>
          {options.map((line) => (
            <MenuRadioItem key={line} value={line} closeOnSelect>
              <MenuItemIndicator>●</MenuItemIndicator>
              {line}
            </MenuRadioItem>
          ))}
        </MenuRadioGroup>
      </MenuContent>
    </Menu>
  );
}

function SearchField({
  stations, line, query, setQuery, labelClass, rowClass, onSelect,
}: {
  stations: SearchStation[];
  line: string;
  query: string;
  setQuery: (query: string) => void;
  labelClass: string;
  rowClass: string;
  onSelect: (id: string) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const bySlug = useMemo(() => new Map(stations.map((station) => [station.slug, station])), [stations]);
  const visible = useMemo(() => filterStations(stations, { line, query: "" }), [stations, line]);
  const hits = useMemo(() => filterStations(visible, { query }).length, [visible, query]);
  const city = visible[0]?.city ?? stations[0]?.city;
  return (
    <Combobox
      value={picked}
      onValueChange={(value) => {
        setPicked(value);
        if (value) {
          const station = bySlug.get(value);
          if (station) onSelect(station.selectId);
        }
      }}
      query={query}
      onQueryChange={(next) => setQuery(next)}
      itemToLabel={(slug) => bySlug.get(slug)?.station ?? slug}
      autoHighlight
      presentation="popover"
      announcement={announcement}
    >
      <ComboboxLabel className={labelClass}>找一站</ComboboxLabel>
      <div className={`ss-input-row ${rowClass}`}>
        <span className="ss-glass" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="M15.5 15.5 20 20" />
          </svg>
        </span>
        <ComboboxInput placeholder="搜站名或菜色" />
        <ComboboxClear aria-label="清除">×</ComboboxClear>
        <ComboboxTrigger aria-label="展開全部站">▾</ComboboxTrigger>
      </div>
      <ComboboxContent side="bottom" align="start" sideOffset={10} anchor={`.${rowClass}`}>
        <ComboboxEmpty data-testid="station-search-empty">{EMPTY_RESULTS}</ComboboxEmpty>
        <ComboboxList>
          {city && visible.length > 0 && (
            <Fragment key={city}>
              <ComboboxGroup>
                <ComboboxGroupLabel>{groupLabel(city)}</ComboboxGroupLabel>
                {visible.map((station) => {
                  const hit = matchShop(station, query);
                  return (
                    <ComboboxItem
                      key={station.slug}
                      value={station.slug}
                      label={station.station}
                      keywords={[station.nameEn ?? "", ...station.shops.flatMap((shop) => [shop.name, shop.dish ?? ""])].filter(Boolean)}
                    >
                      <span className="ss-item-main">
                        <ComboboxItemText />
                        <span className="ss-item-meta">{stationMeta(station)}</span>
                      </span>
                      {hit ? <span className="ss-item-hit">{hit.name}{hit.dish ? `｜${hit.dish}` : ""}</span> : null}
                      <ComboboxItemIndicator>✓</ComboboxItemIndicator>
                    </ComboboxItem>
                  );
                })}
              </ComboboxGroup>
            </Fragment>
          )}
        </ComboboxList>
        {hits > 0 ? <p className="ss-count" data-testid="station-search-count" aria-hidden="true">{resultCountText(hits, query)}</p> : null}
      </ComboboxContent>
    </Combobox>
  );
}

/** Taipei hero search. Rendered by the Taipei view, so it follows that view onto whichever route shows it. */
export function TaipeiStationSearch({ stations }: { stations: SearchStation[] }) {
  const [query, setQuery] = useState("");
  return (
    <div className="ss-hero" lang="zh-Hant" data-testid="station-search">
      <SearchField
        stations={stations}
        line="all"
        query={query}
        setQuery={setQuery}
        labelClass="strip-label ss-hero-label"
        rowClass="ss-anchor-taipei"
        onSelect={openTaipeiStation}
      />
    </div>
  );
}

/** Shanghai notes: search between the intro and the schematic, with a line menu of lines present in the data. */
export function ShanghaiStationSearch({ stations }: { stations: SearchStation[] }) {
  const [query, setQuery] = useState("");
  const [line, setLine] = useState("all");
  const options = useMemo(() => lineOptions(stations), [stations]);
  return (
    <div className="ss-sh" lang="zh-Hant" data-testid="station-search">
      <SearchField
        stations={stations}
        line={line}
        query={query}
        setQuery={setQuery}
        labelClass="ss-sh-label"
        rowClass="ss-anchor-shanghai"
        onSelect={openShanghaiStation}
      />
      <LineMenu value={line} options={options} onChange={setLine} />
    </div>
  );
}
