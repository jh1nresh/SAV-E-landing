import type { FoodLike, MetroLike, SearchStation } from "./station-search.mjs";

export const TAIPEI_LINE_COLOR: Record<string, string>;

export type PickerStation = SearchStation & {
  date: string;
  lineColor: string;
  lineName: string;
};

export type PickerGroup = {
  key: string;
  label: string;
  items: PickerStation[];
};

export function compareNewest(a: PickerStation, b: PickerStation): number;
export function monthKey(date: string): string;
export function monthLabel(date: string): string;
export function latestStation(stations: readonly PickerStation[]): PickerStation | null;
export function groupByMonth(stations: readonly PickerStation[]): PickerGroup[];
export function withFixtureCount(stations: readonly PickerStation[], count: number): PickerStation[];
export function buildPickerStations(
  foodStations: readonly (FoodLike & { date?: string; map?: { line?: string } })[],
  metroStations?: readonly MetroLike[],
  lineColors?: Record<string, string>,
): PickerStation[];
