export function testQueryHooksEnabled(env?: {
  NODE_ENV?: string;
  NEXT_PUBLIC_SAVVY_TEST_HOOKS?: string;
}): boolean;

export const TEST_QUERY_HOOKS: boolean;

export type FreshStore = {
  kind?: string;
  backfill?: boolean;
  addedAt?: string | null;
  sourcePosts?: ReadonlyArray<{ date: string }>;
};

export type FreshSource = {
  id: string;
  stores: readonly FreshStore[];
};
