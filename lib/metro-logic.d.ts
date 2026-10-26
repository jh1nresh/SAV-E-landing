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
