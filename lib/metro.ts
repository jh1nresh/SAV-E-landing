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
  formatMd,
  imageAlt,
  isExampleStore,
  isNewDate,
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
};

export type MetroStation = {
  id: string;
  order: number;
  name: string;
  line: string;
  status: "live" | "coming_soon";
  updatedAt: string | null;
  mapPos: {
    line: "L_red" | "L_blue" | "L_green";
    at: [number, number];
    snapped?: [number, number];
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
  formatMd,
  imageAlt,
  isExampleStore,
  isNewDate,
  priceIsEstimate,
  priceIsPending,
  resolveClock,
  stampLevel,
  stampNote,
  taipeiDate,
  weekNewCount,
};

export function getPublicMetroData(): MetroData {
  return publicMetro as MetroData;
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
