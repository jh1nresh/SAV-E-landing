"use client";

import { useEffect, useId, useRef, useState, type PointerEvent } from "react";
import { shopAnchor } from "../../lib/metro-guide.mjs";
import { getFoodStations, getShanghaiFoodStations, type FoodShop, type FoodStation } from "../../lib/metro";
import {
  FOOD_TYPES,
  defaultSlug,
  parseFood,
  photoFor,
  shopsFor,
  stationsWithFood,
  type FoodId,
} from "../../lib/place-choice.mjs";
import { AppStoreBadge, useSiteCity, useSiteLang, type CityId } from "../SiteChrome";

const taipeiStations = getFoodStations();
const shanghaiStations = getShanghaiFoodStations();
const allStations = [...taipeiStations, ...shanghaiStations];
const STORAGE_KEY = "savvy.browserShortlist";

type SavedRef = { slug: string; key: string };

function stationsFor(city: CityId) {
  return city === "shanghai" ? shanghaiStations : taipeiStations;
}

function stationLabel(station: FoodStation) {
  return station.station.endsWith("站") ? station.station : `${station.station}站`;
}

function cityLabel(city: CityId, lang: "zh-Hant" | "en") {
  if (lang === "en") return city === "shanghai" ? "Shanghai" : "Taipei";
  return city === "shanghai" ? "上海" : "台北";
}

function safeHttp(value: string | null | undefined) {
  return typeof value === "string" && /^https?:\/\//.test(value) ? value : null;
}

function sourcePost(station: FoodStation) {
  const posts = [
    ["Threads", station.posts?.threads],
    ["小紅書", station.posts?.xiaohongshu],
    ["Instagram", station.posts?.instagram],
  ] as const;
  for (const [label, href] of posts) {
    const safe = safeHttp(href);
    if (safe) return { label, href: safe };
  }
  return null;
}

function foodName(id: FoodId, lang: "zh-Hant" | "en") {
  switch (id) {
    case "any":
      return lang === "en" ? "Anything" : "不限";
    case "noodle":
      return lang === "en" ? "Noodles" : "麵";
    case "rice":
      return lang === "en" ? "Rice" : "飯";
    case "dumpling":
      return lang === "en" ? "Dumplings" : "餃子";
    case "soup":
      return lang === "en" ? "Soup" : "湯";
    case "hotpot":
      return lang === "en" ? "Hotpot" : "鍋";
    case "snack":
      return lang === "en" ? "Snacks" : "小吃";
    case "dessert":
      return lang === "en" ? "Sweets" : "甜食";
    case "coffee":
      return lang === "en" ? "Coffee" : "咖啡";
    default: {
      const neverId: never = id;
      return neverId;
    }
  }
}

function readSaved(storage: Storage): SavedRef[] {
  const stored = storage.getItem(STORAGE_KEY);
  try {
    const raw = JSON.parse(stored || "[]") as unknown;
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const slug = "slug" in item && typeof item.slug === "string" ? item.slug : "";
      const key = "key" in item && typeof item.key === "string" ? item.key : "";
      const station = allStations.find((entry) => entry.slug === slug);
      if (!station?.shops.some((shop) => shop.key === key)) return [];
      return [{ slug, key }];
    }).slice(0, 30);
  } catch {
    return [];
  }
}

function isDialogBackdrop(event: PointerEvent<HTMLDialogElement>) {
  const dialog = event.currentTarget;
  if ("closedBy" in HTMLDialogElement.prototype || event.target !== dialog) return false;
  const { left, top, right, bottom } = dialog.getBoundingClientRect();
  return event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom;
}

function previewHref(place: string, food: FoodId, lang: "zh-Hant" | "en", city: CityId, shopKey?: string | null) {
  const params = new URLSearchParams();
  if (lang === "en") params.set("lang", "en");
  if (city === "shanghai") params.set("city", "shanghai");
  params.set("place", place);
  if (food !== "any") params.set("food", food);
  if (shopKey) params.set("shop", shopKey);
  return `/?${params.toString()}`;
}

export default function PlaceChooser() {
  const { city, selection, selectMeal } = useSiteCity();
  const { lang } = useSiteLang();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const backdropPress = useRef<number | null>(null);
  const capsulesRef = useRef<HTMLFieldSetElement>(null);
  const [chipsOverflow, setChipsOverflow] = useState(false);
  const [saved, setSaved] = useState<SavedRef[]>([]);
  const [storageError, setStorageError] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const dialogTitleId = useId();
  const dialogId = useId();
  const stations = stationsFor(city);
  const active = stations.find((station) => station.slug === selection.place) ?? stations.find((station) => station.slug === defaultSlug(stations)) ?? stations[0];
  const types = FOOD_TYPES.filter((type) => type.id === "any" || stationsWithFood(stations, type.id).length > 0);
  const food = parseFood(selection.food);
  const selectedFood = types.some((type) => type.id === food) ? food : "any";
  const matches = active ? shopsFor(active, selectedFood) : [];
  const requestedFilterMatches = selection.food === null || selection.food === selectedFood;
  const requestedShop = selection.place === active?.slug && requestedFilterMatches ? selection.shop : null;
  const shop = matches.find((item) => item.key === requestedShop) ?? matches[0] ?? null;
  const photo = active && shop ? photoFor(active, shop) : null;
  const elsewhere = active ? stationsWithFood(stations, selectedFood).filter((station) => station.slug !== active.slug) : [];
  const savedShops = saved.flatMap((item) => {
    const station = allStations.find((entry) => entry.slug === item.slug);
    const found = station?.shops.find((entry) => entry.key === item.key);
    return station && found ? [{ station, shop: found }] : [];
  });
  const kept = Boolean(active && shop?.key && saved.some((item) => item.slug === active.slug && item.key === shop.key));
  useEffect(() => {
    const sync = () => {
      try {
        setSaved(readSaved(window.localStorage));
      } catch {
        // The visitor may block site storage. Saving will show an inline error.
      }
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) sync();
    };
    sync();
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    const el = capsulesRef.current;
    if (!el) return;
    const measure = () => setChipsOverflow(el.scrollWidth > el.clientWidth + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [lang, city, types.length]);

  function selectPlace(slug: string) {
    selectMeal(city, { place: slug, food: selectedFood === "any" ? null : selectedFood, shop: null });
    dialogRef.current?.close();
    setDialogOpen(false);
  }

  function revealChip(event: { currentTarget: HTMLInputElement }) {
    const chip = event.currentTarget.closest(".capsule");
    const scroller = capsulesRef.current;
    if (!(chip instanceof HTMLElement) || !scroller) return;
    const scrollerRect = scroller.getBoundingClientRect();
    const chipRect = chip.getBoundingClientRect();
    if (chipRect.left < scrollerRect.left) scroller.scrollLeft -= scrollerRect.left - chipRect.left;
    else if (chipRect.right > scrollerRect.right) scroller.scrollLeft += chipRect.right - scrollerRect.right;
  }

  function scrollChips() {
    const scroller = capsulesRef.current;
    if (!scroller) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    scroller.scrollBy({ left: Math.max(120, scroller.clientWidth * 0.6), behavior: motion ? "auto" : "smooth" });
  }

  function selectFood(next: FoodId) {
    if (active) selectMeal(city, { place: active.slug, food: next === "any" ? null : next, shop: null });
  }

  function selectShop(next: FoodShop) {
    if (active) selectMeal(city, { place: active.slug, food: selectedFood === "any" ? null : selectedFood, shop: next.key ?? null });
  }

  async function toggleSaved() {
    if (!active || !shop?.key) return;
    const entry = { slug: active.slug, key: shop.key };
    const update = () => {
      const storage = window.localStorage;
      const current = readSaved(storage);
      const existing = current.some((item) => item.slug === entry.slug && item.key === entry.key);
      const next = kept
        ? current.filter((item) => item.slug !== entry.slug || item.key !== entry.key)
        : existing ? current : [...current, entry].slice(-30);
      storage.setItem(STORAGE_KEY, JSON.stringify(next));
      setSaved(next);
    };
    try {
      if (navigator.locks) await navigator.locks.request(STORAGE_KEY, update);
      else update();
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }

  function openSaved(station: FoodStation, found: FoodShop) {
    selectMeal(station.city, { place: station.slug, food: null, shop: found.key ?? null });
  }

  const preview = active ? previewHref(active.slug, selectedFood, lang, active.city, shop?.key) : "/";
  const post = active ? sourcePost(active) : null;
  const price = shop?.price?.trim() || "";
  const priceSource = shop?.price_source?.trim() || "";

  return (
    <>
      <div className="choose-frame">
      <div className={photo ? "choose-stage" : "choose-stage is-empty"} data-testid="choose-stage">
        {photo && shop ? (
          <img
            className="choose-photo"
            src={photo}
            alt={shop.dish ? `${shop.name}：${shop.dish}` : shop.name || stationLabel(active)}
            width={1200}
            height={900}
            sizes="(max-width: 800px) 100vw, 70vw"
            fetchPriority="high"
            decoding="async"
            data-testid="choose-photo"
          />
        ) : null}
        <div
          className="choose-panel"
          tabIndex={0}
          role="region"
          aria-label={lang === "en" ? "This result" : "這次的結果"}
          data-testid="choose-result"
          data-place={active?.slug ?? ""}
          data-food={selectedFood}
        >
          <search>
            <fieldset className="choose-capsules" ref={capsulesRef}>
              <legend className="choose-sentence">
                <span className="zh">我想在</span>
                <span className="en">Near</span>{" "}
                <span className="choose-city">{cityLabel(city, lang)}</span>{" "}
                <button
                  type="button"
                  className="choose-place"
                  aria-haspopup="dialog"
                  aria-controls={dialogId}
                  aria-expanded={dialogOpen}
                  onClick={() => {
                    dialogRef.current?.showModal();
                    setDialogOpen(true);
                  }}
                >
                  <span lang="zh-Hant">{active ? stationLabel(active) : ""}</span>
                  <span className="visually-hidden zh">，選車站</span>
                  <span className="visually-hidden en">, choose a station</span>
                </button>{" "}
                <span className="zh">附近吃</span>
                <span className="en">I want</span>
              </legend>
              {types.map((type) => (
                <label className="capsule" key={type.id}>
                  <input
                    type="radio"
                    name="savvy-food"
                    value={type.id}
                    checked={selectedFood === type.id}
                    onChange={() => selectFood(type.id)}
                    onFocus={revealChip}
                  />
                  {foodName(type.id, lang)}
                </label>
              ))}
              {chipsOverflow ? (
                <button type="button" className="choose-more-types" onClick={scrollChips}>
                  <span className="zh">更多類型</span>
                  <span className="en">More types</span>
                </button>
              ) : null}
            </fieldset>
          </search>

          {shop && active ? (
            <article>
              <p className="choose-kicker">
                <span className="zh">Savvy 編選</span>
                <span className="en">Savvy edit</span>
              </p>
              <h2 className="choose-shop" id="choose-shop-title">
                {shop.name}
              </h2>
              {shop.dish?.trim() ? <p className="choose-dish">{shop.dish}</p> : null}
              <p className="choose-meta">
                {cityLabel(active.city, lang)} · <span lang="zh-Hant">{stationLabel(active)}</span>
                {shop.exit_walk?.trim()
                  ? lang === "en"
                    ? ` · ${shop.exit_walk.trim()}`
                    : ` · 離站 ${shop.exit_walk.trim()}`
                  : lang === "en"
                    ? ` · ${active.date} note`
                    : ` · ${active.date} 筆記`}
              </p>
              <div className="choose-actions">
                <button type="button" className="choose-keep" aria-pressed={kept} onClick={toggleSaved} data-testid="choose-keep">
                  {kept
                    ? lang === "en" ? "Kept in this browser" : "已留在這個瀏覽器"
                    : lang === "en" ? "Keep in this browser" : "先留在這個瀏覽器"}
                </button>
                <a href={`/metro/${active.slug}#${shopAnchor(shop, Math.max(0, active.shops.indexOf(shop)))}`}>
                  <span className="zh">看這一站的筆記</span>
                  <span className="en">Open the station note</span>
                </a>
              </div>
              <p className="choose-note" aria-live="polite">
                <span className="zh">{storageError ? "無法更新暫存，請確認瀏覽器允許網站儲存。" : "只存在這個瀏覽器，沒有存進 App。"}</span>
                <span className="en">{storageError ? "Couldn’t update your shortlist. Check your browser’s site storage settings." : "Stored only in this browser. Nothing is sent to the app."}</span>
              </p>
              <div className="choose-download" data-testid="hero-appstore">
                <AppStoreBadge />
              </div>
              {price && priceSource ? (
                <p className="choose-price">
                  {price}
                  <small> · {priceSource}</small>
                  <small> · <span className="zh">筆記價格，不是今日現價</span><span className="en">Noted price, not today’s price</span></small>
                </p>
              ) : null}
              {active.tagline?.trim() ? <p className="choose-note">{active.tagline}</p> : null}
              <p className="choose-note">
                <span className="zh">照筆記順序，不是排名，也不是朋友推薦。</span>
                <span className="en">Note order, not a ranking and not a friend recommendation.</span>
              </p>
              <div className="choose-actions">
                {post ? (
                  <a className="choose-source" href={post.href} target="_blank" rel="noopener noreferrer">
                    {post.label}
                  </a>
                ) : null}
                <a href={preview} data-testid="choose-preview-link">
                  <span className="zh">這份預覽網址</span>
                  <span className="en">This preview link</span>
                </a>
              </div>
              {matches.length > 1 ? (
                <ul className="choose-more" aria-label={lang === "en" ? "Other shops in this filter" : "這次篩到的其他店"}>
                  {matches.map((item) => (
                    <li key={item.key || item.name}>
                      <button type="button" aria-pressed={item === shop} onClick={() => selectShop(item)}>
                        {item.name}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          ) : (
            <div className="choose-empty" data-testid="choose-empty">
              <p className="choose-kicker">
                <span className="zh">Savvy 編選</span>
                <span className="en">Savvy edit</span>
              </p>
              <p>
                <span className="zh">
                  {active ? `${stationLabel(active)}這份筆記沒有「${foodName(selectedFood, lang)}」。` : "沒有符合的筆記。"}
                  沒有補上別的店。
                </span>
                <span className="en">
                  {active ? `${stationLabel(active)} has no published “${foodName(selectedFood, "en")}” in this note. ` : "No matching note. "}
                  No extra places were added.
                </span>
              </p>
              {elsewhere.length > 0 ? (
                <div className="choose-actions">
                  {elsewhere.slice(0, 6).map((station) => (
                    <button type="button" className="choose-alt" key={station.slug} onClick={() => selectPlace(station.slug)}>
                      <span lang="zh-Hant">{stationLabel(station)}</span>
                    </button>
                  ))}
                </div>
              ) : null}
              <div className="choose-download" data-testid="hero-appstore">
                <AppStoreBadge />
              </div>
            </div>
          )}
        </div>
      </div>
      </div>

      <dialog
        ref={dialogRef}
        id={dialogId}
        className="choose-dialog"
        aria-labelledby={dialogTitleId}
        closedby="any"
        onClose={() => {
          backdropPress.current = null;
          setDialogOpen(false);
        }}
        onPointerDown={(event) => {
          backdropPress.current = isDialogBackdrop(event) ? event.pointerId : null;
        }}
        onPointerUp={(event) => {
          if (backdropPress.current === event.pointerId && isDialogBackdrop(event)) event.currentTarget.close();
          backdropPress.current = null;
        }}
        onPointerCancel={() => { backdropPress.current = null; }}
      >
        <h2 id={dialogTitleId}>
          <span className="zh">選一個已發布的站</span>
          <span className="en">Choose a published station</span>
        </h2>
        <p className="choose-note">
          <span className="zh">{cityLabel(city, "zh-Hant")} {stations.length} 站。城市用頁首切換，這裡只列那個城市已發布的站。順序不是排名。</span>
          <span className="en">{stations.length} published stations in the header’s city. Order is not a ranking.</span>
        </p>
        <ul className="choose-dialog-list">
          {stations.map((station) => (
            <li key={station.slug}>
              <button type="button" aria-current={station.slug === active?.slug ? "true" : undefined} onClick={() => selectPlace(station.slug)}>
                <span lang="zh-Hant">{stationLabel(station)}</span>
                {station.tagline ? <small> · {station.tagline}</small> : null}
              </button>
            </li>
          ))}
        </ul>
        <form method="dialog">
          <button type="submit" className="choose-alt">
            <span className="zh">關閉</span>
            <span className="en">Close</span>
          </button>
        </form>
      </dialog>

      {savedShops.length > 0 ? (
        <section className="choose-saved" aria-labelledby="browser-shortlist-title">
          <h2 id="browser-shortlist-title">
            <span className="zh">這個瀏覽器的暫存</span>
            <span className="en">Browser-only shortlist</span>
          </h2>
          <p className="choose-note">
            <span className="zh">只留在這個瀏覽器。沒有匯進 Savvy，也不是朋友的清單。</span>
            <span className="en">Kept in this browser only. Not imported into Savvy, and not a friend list.</span>
          </p>
          <ul className="choose-stations">
            {savedShops.map(({ station, shop: found }) => (
              <li key={`${station.slug}-${found.key}`}>
                <button type="button" className="choose-alt" onClick={() => openSaved(station, found)}>
                  {found.name}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="choose-app" aria-labelledby="keep-later-title">
        <h2 id="keep-later-title">
          <span className="zh">想之後再去</span>
          <span className="en">Keep it for later</span>
        </h2>
        <p>
          <span className="zh">這個網站先幫你挑現在吃什麼。Savvy 把想去的店留在自己的收藏裡。朋友請你吃什麼是 App 的方向，這頁的店是 Savvy 編選。整份清單還不能存進 App。</span>
          <span className="en">The site helps you choose now. Savvy keeps places you want for later. Friend suggestions are a product direction; this page is a Savvy edit. A whole list still cannot be saved into the app.</span>
        </p>
      </section>

      <nav className="choose-browse" aria-labelledby="station-edits-title">
        <h2 id="station-edits-title">
          <span className="zh">已發布的站點編選</span>
          <span className="en">Published station edits</span>
        </h2>
        <p className="choose-limit">
          <span className="zh">這裡是已經上站的捷運站筆記，不是主題清單。主題清單沒有進這個網站，所以沒有另做一份。價格與出處一併顯示。營業時間留在站點筆記，避免被看成現在有沒有開。</span>
          <span className="en">These are published station notes. A thematic list is not in this site, so none is shown. Prices appear with their sources. Hours stay on the station note so this card does not look like a live open/closed status.</span>
        </p>
        <ul className="choose-stations">
          {stations.map((station) => (
            <li key={station.slug}>
              <a href={previewHref(station.slug, "any", lang, station.city)} aria-current={station.slug === active?.slug ? "true" : undefined} lang="zh-Hant">
                {stationLabel(station)}
              </a>
              <a href={`/metro/${station.slug}`}>
                <span className="zh">筆記</span>
                <span className="en">Note</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
