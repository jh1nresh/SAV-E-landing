export function taipeiDate(now?: Date): string;
export function daysBetween(fromYmd: string, toYmd: string): number;
export function isNewDate(addedAt: string | null | undefined, todayYmd: string): boolean;
export function formatMd(ymd: string | null | undefined): string;
export const PRICE_PENDING_LABEL: string;
export function priceIsEstimate(store: {
  verified?: boolean;
  priceCheckedAt?: string | null;
  pricePending?: boolean;
}): boolean;
export function priceIsPending(store: { pricePending?: boolean; priceNT?: number | null }): boolean;
export function resolveClock(search: string | URLSearchParams | null | undefined, now?: Date): string;
export const STORE_KINDS: readonly ["example", "post"];
export function isExampleStore(store: { kind?: string } | null | undefined): boolean;
export const EXAMPLE_STAMP_NOTE: string;
export const EXAMPLE_STAMP_NOTE_EN: string;
export const PARTIAL_STAMP_NOTE: string;
export const PARTIAL_STAMP_NOTE_EN: string;
export type StampLevel = "example" | "partial" | "none";
export function stampLevel(stores: ReadonlyArray<{ kind?: string }> | null | undefined): StampLevel;
export function stampNote(stores: ReadonlyArray<{ kind?: string }>, lang?: "zh" | "en"): string;
export function countShort(n: number, lang?: "zh" | "en"): string;
export function countLabel(stores: ReadonlyArray<{ kind?: string }>, lang?: "zh" | "en"): string;
export function countBadge(stores: ReadonlyArray<{ kind?: string }>): string;
export function weekNewCount(stores: ReadonlyArray<NewStore>, todayYmd: string): number;
export function footNote(store: { kind?: string; image?: string; imageAi?: boolean }): string;
export function imageAlt(store: { dish?: string; name: string; kind?: string; imageAi?: boolean }): string;

export type NewStore = {
  kind?: string; backfill?: boolean; addedAt?: string | null;
  sourcePosts?: ReadonlyArray<{ date: string }>;
};
export const NEW_FLOW_START: string;
export const MAX_POST_TO_LIVE_DAYS: number;
export function isCalendarDate(value: unknown): value is string;
export function isFresh(store: NewStore | null | undefined): boolean;
export function isNewStore(store: NewStore, todayYmd: string): boolean;
export function stationIsNew(stores: ReadonlyArray<NewStore>, todayYmd: string): boolean;
