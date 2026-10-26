import publicMetro from "../app/metro/metro.public.json";
import {
  daysBetween,
  formatMd,
  isNewDate,
  priceIsEstimate,
  resolveClock,
  taipeiDate,
} from "./metro-logic.mjs";

export type SourcePlatform = "ig" | "threads" | "xhs";

export type SourcePost = {
  platform: SourcePlatform;
  url: string;
  date: string;
};

export type MetroStore = {
  id: string;
  stationId: string;
  name: string;
  dish: string;
  priceNT: number;
  priceFrom: boolean;
  priceSource: string;
  priceCheckedAt: string | null;
  exit: string | null;
  exitWalkMin: number;
  area: string;
  hours: string;
  image: string;
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
    example: boolean;
    asOf: string;
    note?: string;
  };
  stations: MetroStation[];
  stores: MetroStore[];
};

export {
  daysBetween,
  formatMd,
  isNewDate,
  priceIsEstimate,
  resolveClock,
  taipeiDate,
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
