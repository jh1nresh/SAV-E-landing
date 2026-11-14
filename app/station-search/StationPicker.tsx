"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  Menu,
  MenuContent,
  MenuGroupLabel,
  MenuItemIndicator,
  MenuRadioGroup,
  MenuRadioItem,
  MenuTrigger,
} from "@ui-sdk/react/menu";
import { formatMd, stationIsNew } from "../../lib/metro-logic.mjs";
import {
  EMPTY_RESULTS,
  filterStations,
  lineOptions,
  resultCountText,
  type SearchStation,
} from "../../lib/station-search.mjs";
import {
  compareNewest,
  groupByMonth,
  latestStation,
  withFixtureCount,
  type PickerStation,
} from "../../lib/station-picker.mjs";
import { TEST_QUERY_HOOKS, type FreshSource } from "../../lib/test-hooks.mjs";
import "./station-search.css";
import "./station-picker.css";

type City = "taipei" | "shanghai";

function scrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

function focusStill(el: HTMLElement | null | undefined) {
  el?.focus({ preventScroll: true });
}

/** Move the active option inside the list. scrollIntoView would also scroll the page. */
function scrollOptionIntoList(id: string) {
  const el = document.getElementById(id);
  const list = el?.closest(".sd-list");
  if (!(el instanceof HTMLElement) || !(list instanceof HTMLElement)) return;
  const elRect = el.getBoundingClientRect();
  const listRect = list.getBoundingClientRect();
  if (elRect.top < listRect.top) list.scrollTop -= listRect.top - elRect.top;
  else if (elRect.bottom > listRect.bottom) list.scrollTop += elRect.bottom - listRect.bottom;
}

function stationHref(city: City, slug: string) {
  switch (city) {
    case "taipei":
      return `/metro/${slug}`;
    case "shanghai":
      return `#${slug}`;
    default: {
      const neverCity: never = city;
      return neverCity;
    }
  }
}

function markSelected(station: PickerStation) {
  document.querySelectorAll(".pin.picked, .sh-map a.picked").forEach((el) => el.classList.remove("picked"));
  if (station.city === "shanghai") {
    document.querySelector(`.sh-map a[href="#${station.slug}"]`)?.classList.add("picked");
    return;
  }
  document.querySelector(`[data-testid="metro-pin-${station.selectId}"]`)?.classList.add("picked");
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
  el.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
}

function writeHash(slug: string) {
  const url = new URL(window.location.href);
  url.hash = slug;
  history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

function LineMenu({ value, options, onChange }: { value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <Menu>
      <MenuTrigger className="chip ss-menu-trigger" aria-label="只看這條線">
        {value === "all" ? "全部路線" : value}
        <span aria-hidden="true" className="ss-caret">▾</span>
      </MenuTrigger>
      <MenuContent sideOffset={8} align="end">
        <MenuRadioGroup value={value} onValueChange={onChange}>
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

function FallbackList({ stations, city }: { stations: PickerStation[]; city: City }) {
  const groups = groupByMonth(stations);
  return (
    <nav className="sd-fallback" data-testid="station-fallback" aria-label="找一站">
      {groups.map((group) => (
        <div key={group.key}>
          <p className="sd-group">{group.label}</p>
          <ul>
            {group.items.map((station) => (
              <li key={station.slug}>
                <a href={stationHref(city, station.slug)}>{station.station}</a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function StationPicker({
  stations,
  city,
  freshIds,
  freshSources,
  note,
  partial,
  showLineMenu,
}: {
  stations: PickerStation[];
  city: City;
  freshIds: readonly string[];
  freshSources?: readonly FreshSource[];
  note?: string;
  partial?: boolean;
  showLineMenu?: boolean;
}) {
  const listId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pointerRef = useRef({ x: Number.NaN, y: Number.NaN });
  const [rows, setRows] = useState(stations);
  const [freshList, setFreshList] = useState(freshIds);
  const latest = latestStation(rows);
  const [live, setLive] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [line, setLine] = useState("all");
  const [selectedId, setSelectedId] = useState(latest?.selectId ?? "");
  const [active, setActive] = useState(0);
  const options = useMemo(() => lineOptions(rows as SearchStation[]), [rows]);
  const ordered = useMemo(() => rows.slice().sort(compareNewest), [rows]);
  const visible = useMemo(
    () => filterStations(filterStations(ordered, { line }), { query }) as PickerStation[],
    [ordered, line, query],
  );
  const groups = useMemo(() => groupByMonth(visible), [visible]);
  const selected = rows.find((station) => station.selectId === selectedId) ?? latest;
  const fresh = new Set(freshList);

  useEffect(() => { setLive(true); }, []);

  useEffect(() => {
    if (!TEST_QUERY_HOOKS) return;
    const params = new URLSearchParams(window.location.search);
    const fixture = Number(params.get("pickerFixture"));
    const next = Number.isFinite(fixture) && fixture > stations.length ? withFixtureCount(stations, fixture) : stations;
    setRows(next);
    const clock = params.get("clock");
    if (clock && /^\d{4}-\d{2}-\d{2}$/.test(clock) && freshSources) {
      setFreshList(freshSources.filter((source) => stationIsNew(source.stores, clock)).map((source) => source.id));
    }
    if (next !== stations && !window.location.hash) {
      const newest = latestStation(next);
      if (newest) setSelectedId(newest.selectId);
    }
  }, [stations, freshSources]);

  useEffect(() => {
    if (!open) return;
    focusStill(inputRef.current);
  }, [open]);

  useEffect(() => {
    const station = rows.find((item) => item.selectId === selectedId);
    if (!station) return;
    let cancelled = false;
    const tick = (left: number) => {
      if (cancelled) return;
      const found = station.city === "shanghai"
        ? document.querySelector(`.sh-map a[href="#${station.slug}"]`)
        : document.querySelector(`[data-testid="metro-pin-${station.selectId}"]`);
      if (found) {
        markSelected(station);
        return;
      }
      if (left > 0) window.setTimeout(() => tick(left - 1), 50);
    };
    tick(80);
    return () => { cancelled = true; };
  }, [selectedId, rows]);

  useEffect(() => {
    const slug = decodeURIComponent(window.location.hash.replace(/^#/, ""));
    if (!slug) return;
    const station = rows.find((item) => item.slug === slug);
    if (!station) return;
    setSelectedId(station.selectId);
    if (station.city === "shanghai") openShanghaiStation(station.slug);
    else openTaipeiStation(station.selectId);
  }, [rows]);

  useEffect(() => {
    const onPick = (event: Event) => {
      const id = (event as CustomEvent<{ id?: string }>).detail?.id;
      if (!id) return;
      const station = rows.find((item) => item.selectId === id);
      if (station) setSelectedId(station.selectId);
    };
    document.addEventListener("savvy-station", onPick);
    return () => document.removeEventListener("savvy-station", onPick);
  }, [rows]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const menu = document.querySelector("[data-slot=menu-content][data-open]:not([data-closed])");
      if (menu) return;
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      focusStill(triggerRef.current);
    };
    const onPointer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node) || dockRef.current?.contains(target)) return;
      if (target instanceof Element && target.closest("[data-slot=menu-content]")) return;
      setOpen(false);
      focusStill(triggerRef.current);
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  function choose(station: PickerStation) {
    setSelectedId(station.selectId);
    setOpen(false);
    writeHash(station.slug);
    markSelected(station);
    if (station.city === "shanghai") openShanghaiStation(station.slug);
    else openTaipeiStation(station.selectId);
    window.setTimeout(() => focusStill(triggerRef.current), 360);
  }

  function moveActive(next: number) {
    if (!visible.length) return;
    const index = Math.max(0, Math.min(visible.length - 1, next));
    setActive(index);
    scrollOptionIntoList(`${listId}-${visible[index]?.selectId}`);
  }

  function onDockPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const point = pointerRef.current;
    const same = event.clientX === point.x && event.clientY === point.y;
    point.x = event.clientX;
    point.y = event.clientY;
    if (same) return;
    const option = event.target instanceof Element ? event.target.closest("[data-slot=combobox-item]") : null;
    if (!option) return;
    const id = option.getAttribute("data-station-id");
    const index = visible.findIndex((station) => station.selectId === id);
    if (index >= 0) setActive(index);
  }

  function onInputKey(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActive(active + 1);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActive(active - 1);
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      moveActive(0);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      moveActive(visible.length - 1);
      return;
    }
    if (event.key === "Enter" || (event.key === " " && query.trim() === "")) {
      event.preventDefault();
      const station = visible[active];
      if (station) choose(station);
    }
  }

  const dateLabel = selected ? formatMd(selected.date) : "";
  const updated = latest ? `更新於 ${formatMd(latest.date)}` : "";

  return (
    <div className={`sd-dock${city === "taipei" ? " has-stamp" : ""}`} lang="zh-Hant" data-testid="station-search" ref={dockRef} onPointerMove={onDockPointerMove}>
      <div hidden={live} className="sd-static">
        <div className="sd-label-row">
          <p className="sd-label">找一站</p>
          {city === "taipei" ? (
            <div className="stamp sd-stamp" aria-hidden="true">
              <span>{updated}</span>
              {note ? <i className={partial ? "partial" : undefined}>{note}</i> : null}
            </div>
          ) : null}
        </div>
        <FallbackList stations={ordered} city={city} />
      </div>
      <div hidden={!live} className="sd-live">
        <div className="sd-label-row">
          <p className="sd-label" id={`${listId}-label`}>找一站</p>
          {city === "taipei" ? <span className="sd-stamp-slot" aria-hidden="true" /> : null}
        </div>
        <button
          type="button"
          className="sd-trigger"
          data-testid="station-picker-trigger"
          ref={triggerRef}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="sd-dot" style={{ background: selected?.lineColor }} aria-hidden="true" />
          <span className="sd-trigger-text">
            <span className="sd-trigger-kicker">{selected ? `第 ${selected.n} 站 · ${dateLabel}` : "找一站"}</span>
            <span className="sd-trigger-name">
              {selected?.station}
              {selected && fresh.has(selected.selectId) ? <span className="newtag">NEW</span> : null}
            </span>
          </span>
          <span className="sd-caret" aria-hidden="true">
            <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
              <path d="M1 1.5 L6 6.5 L11 1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>
        <div className="sd-panel" data-open={open ? "true" : "false"} hidden={!open}>
          <button type="button" className="sd-backdrop" aria-label="關閉選站" tabIndex={-1} onClick={() => { setOpen(false); focusStill(triggerRef.current); }} />
          <div className="sd-sheet" role="presentation">
            <div className="sd-sheet-handle" aria-hidden="true"><span /></div>
            <p className="sd-sheet-title">找一站</p>
            <div className="sd-search-row">
              <div className="sd-search">
                <span className="sd-search-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <circle cx="11" cy="11" r="7" />
                    <path d="M20 20 L16.5 16.5" />
                  </svg>
                </span>
                <input
                  ref={inputRef}
                  role="combobox"
                  aria-expanded={open}
                  aria-controls={listId}
                  aria-autocomplete="list"
                  aria-label="搜站名或菜色"
                  placeholder="搜站名或菜色"
                  value={query}
                  onChange={(event) => { setQuery(event.target.value); setActive(0); }}
                  onKeyDown={onInputKey}
                />
              </div>
              {showLineMenu ? <LineMenu value={line} options={options} onChange={(next) => { setLine(next); setActive(0); }} /> : null}
            </div>
            {visible.length === 0 ? (
              <p className="sd-empty" data-testid="station-search-empty">{EMPTY_RESULTS}</p>
            ) : (
              <div
                className="sd-list"
                id={listId}
                role="listbox"
                aria-labelledby={`${listId}-label`}
                data-slot="combobox-content"
              >
                {groups.map((group) => (
                  <div key={group.key}>
                    <p className="sd-group">{group.label}</p>
                    {group.items.map((station) => {
                      const index = visible.indexOf(station);
                      const isSelected = station.selectId === selectedId;
                      return (
                        <button
                          type="button"
                          key={station.selectId}
                          id={`${listId}-${station.selectId}`}
                          className="sd-option"
                          role="option"
                          data-testid={`station-option-${station.selectId}`}
                          data-slot="combobox-item"
                          data-station-id={station.selectId}
                          data-highlighted={index === active ? "true" : undefined}
                          aria-selected={isSelected}
                          onClick={() => choose(station)}
                        >
                          <span className="sd-dot" style={{ background: station.lineColor }} aria-hidden="true" />
                          <span className="sd-option-main">
                            <span className="sd-option-name" data-slot="combobox-item-text">
                              {station.station}
                              {fresh.has(station.selectId) ? <span className="newtag">NEW</span> : null}
                            </span>
                            <span className="sd-option-meta">第 {station.n} 站{station.lineName ? ` · ${station.lineName}` : ""}</span>
                          </span>
                          <span className="sd-option-date">{formatMd(station.date) || "即將更新"}</span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
            {visible.length > 0 ? (
              <p className="sd-foot" data-testid="station-search-count" aria-hidden="true">{resultCountText(visible.length, query)}</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
