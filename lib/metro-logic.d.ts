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
export function stampNote(stores: ReadonlyArray<{ kind?: string }>): string;
export function footNote(store: { kind?: string; image?: string; imageAi?: boolean }): string;
export function imageAlt(store: { dish?: string; name: string; kind?: string; imageAi?: boolean }): string;
