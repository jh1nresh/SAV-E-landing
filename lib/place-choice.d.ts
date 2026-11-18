export const FOOD_TYPES: readonly {
  id: FoodId;
  zh: string;
  en: string;
}[];

export type FoodId =
  | "any"
  | "noodle"
  | "rice"
  | "dumpling"
  | "soup"
  | "hotpot"
  | "snack"
  | "dessert"
  | "coffee";

export function foodTypeOf(shop: { dish?: string | null }): FoodId;
export function parseFood(value: string | null | undefined): FoodId;
export function shopsFor<T extends { dish?: string | null }>(
  station: { shops?: readonly T[] },
  food: FoodId,
): T[];
export function stationsWithFood<T extends { shops?: readonly { dish?: string | null }[] }>(
  stations: readonly T[],
  food: FoodId,
): T[];
export function photoFor(
  station: { images?: { photos?: string[] } },
  shop: { key?: string | null },
): string | null;
export function defaultSlug(stations: Array<{ slug: string }>): string;
export const DEFAULT_PLACE: "tamsui";
