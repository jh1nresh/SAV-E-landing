import publicMetro from "../app/metro/metro.public.json";
import {
  EXAMPLE_STAMP_NOTE,
  EXAMPLE_STAMP_NOTE_EN,
  PARTIAL_STAMP_NOTE,
  PARTIAL_STAMP_NOTE_EN,
  PRICE_PENDING_LABEL,
  STORE_KINDS,
  countBadge,
  countLabel,
  countShort,
  daysBetween,
  footNote,
  foodShopRows,
  formatMd,
  imageAlt,
  isExampleStore,
  isNewDate,
  isNewStore,
  stationIsNew,
  priceIsEstimate,
  priceIsPending,
  resolveClock,
  stampLevel,
  stampNote,
  taipeiDate,
  weekNewCount,
} from "./metro-logic.mjs";

export type SourcePlatform = "ig" | "threads" | "xhs";

export type SourcePost = {
  platform: SourcePlatform;
  url: string;
  date: string;
};

/** "example" = illustrative entry; "post" = entry grown from a real founder post. */
export type StoreKind = (typeof STORE_KINDS)[number];

export type MetroStore = {
  id: string;
  kind: StoreKind;
  backfill?: boolean;
  stationId: string;
  name: string;
  /** Required for example; optional for post. */
  dish?: string;
  priceNT?: number;
  priceFrom: boolean;
  priceSource?: string;
  pricePending?: boolean;
  priceCheckedAt: string | null;
  exit: string | null;
  exitWalkMin?: number | null;
  area?: string;
  hours?: string;
  image?: string;
  /** Only ever `false` (founder/licensed photo); absent means an AI illustration. Derived at build. */
  imageAi?: false;
  sourcePosts: SourcePost[];
  addedAt: string;
  verified: boolean;
  /** Display fields from the station article, without numeric price/walk guesses. */
  article?: FoodShop;
};

export type MetroStation = {
  id: string;
  /** Food-page slug: /metro/<slug>. */
  slug?: string;
  order: number;
  name: string;
  line: string;
  status: "live" | "coming_soon";
  updatedAt: string | null;
  mapPos: {
    line: "L_red" | "L_blue" | "L_green" | "L_orange";
    at: [number, number];
    snapped?: [number, number];
    /** Label beside the dot instead of below it (keeps clear of neighbouring photo pins). */
    label?: "left" | "right";
    /** Extra [dx, dy] nudge for the station name, in map units (DESIGN r12). */
    labelOffset?: [number, number];
    /** No-JS poster only: replaces labelOffset there so the interactive map stays unchanged (DESIGN r15). */
    posterLabelOffset?: [number, number];
  };
};

export type MetroData = {
  _meta: {
    asOf: string;
    note?: string;
  };
  stations: MetroStation[];
  stores: MetroStore[];
};

export {
  EXAMPLE_STAMP_NOTE,
  EXAMPLE_STAMP_NOTE_EN,
  PARTIAL_STAMP_NOTE,
  PARTIAL_STAMP_NOTE_EN,
  PRICE_PENDING_LABEL,
  STORE_KINDS,
  countBadge,
  countLabel,
  countShort,
  daysBetween,
  footNote,
  foodShopRows,
  formatMd,
  imageAlt,
  isExampleStore,
  isNewDate,
  isNewStore,
  stationIsNew,
  priceIsEstimate,
  priceIsPending,
  resolveClock,
  stampLevel,
  stampNote,
  taipeiDate,
  weekNewCount,
};

export function getPublicMetroData(): MetroData {
  const { _meta, stations, mapStores } = publicMetro as unknown as MetroData & { mapStores: MetroStore[] };
  return { _meta, stations, stores: mapStores };
}

export function storesFor(data: MetroData, stationId: string): MetroStore[] {
  return data.stores.filter((store) => store.stationId === stationId);
}

export function latestUpdatedAt(data: MetroData): string | null {
  const dates = data.stations.map((s) => s.updatedAt).filter((d): d is string => Boolean(d));
  if (!dates.length) return null;
  return dates.slice().sort().pop() ?? null;
}

export function stationPoint(station: MetroStation): [number, number] {
  return station.mapPos.snapped ?? station.mapPos.at;
}

export type FoodShop = {
  key?: string | null;
  name?: string | null;
  dish?: string | null;
  price?: string | null;
  price_source?: string | null;
  address?: string | null;
  exit_walk?: string | null;
  hours?: string | null;
  lat?: number | null;
  lng?: number | null;
  /** Present only when the package supplied a coordinate field. `WGS-84` is the only stored datum. */
  datum?: "WGS-84" | null;
  geoStatus?: "pending" | "wgs84";
};
export type FoodStation = {
  city: "taipei" | "shanghai";
  n: number; date: string; station: string; slug: string; tagline?: string | null;
  map: {
    line: string;
    at: [number, number];
    snapped?: [number, number];
    label?: "left" | "right";
    labelOffset?: [number, number];
    posterLabelOffset?: [number, number];
  };
  /** Official line numbers for this city, such as Shanghai `["1","14"]`. */
  metro_lines?: string[];
  lat?: number | null;
  lng?: number | null;
  datum?: "WGS-84" | null;
  geoStatus?: "pending" | "wgs84";
  shops: FoodShop[];
  images: { photos: string[]; slides: string[] };
  posts: { instagram?: string | null; threads?: string | null; xiaohongshu?: string | null };
};
export function getFoodStations(): FoodStation[] {
  return (publicMetro as unknown as { foodStations: FoodStation[] }).foodStations;
}

export function getShanghaiFoodStations(): FoodStation[] {
  return (publicMetro as unknown as { shanghaiFoodStations?: FoodStation[] }).shanghaiFoodStations ?? [];
}
