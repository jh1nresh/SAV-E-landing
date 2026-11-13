export const EMPTY_RESULTS: string;
export const SCROLL_HINT_AFTER: number;

export type SearchCity = "taipei" | "shanghai";

export type SearchShop = { name: string; dish: string | null };

export type SearchStation = {
  city: SearchCity;
  n: number;
  station: string;
  slug: string;
  selectId: string;
  nameEn: string | null;
  line: string | null;
  metroLines: string[] | null;
  shops: SearchShop[];
};

export type FoodLike = {
  city?: string;
  n: number;
  station: string;
  slug: string;
  name_en?: string | null;
  metro_lines?: readonly string[] | null;
  shops?: ReadonlyArray<{ name?: string | null; dish?: string | null } | null>;
};

export type MetroLike = { id: string; slug?: string; line?: string | null };

export function groupLabel(city: SearchCity): string;
export function linesOf(station: SearchStation): string[];
export function lineText(station: SearchStation): string;
export function stationMeta(station: SearchStation): string;
export function lineOptions(stations: readonly SearchStation[]): string[];
export function matchesQuery(station: SearchStation, query: string): boolean;
export function filterStations(
  stations: readonly SearchStation[],
  filters?: { line?: string; query?: string },
): SearchStation[];
export function matchShop(station: SearchStation, query: string): SearchShop | undefined;
export function resultCountText(count: number, query: string): string;
export function announcement(change: {
  type: string;
  count?: number;
  query?: string;
  loading?: boolean;
  label?: string;
}): string | null;
export function buildSearchIndex(
  foodStations: readonly FoodLike[],
  metroStations?: readonly MetroLike[],
): SearchStation[];
