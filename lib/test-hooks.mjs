/**
 * `?clock=` and `?pickerFixture=` exist for tests.
 * A production build ignores both unless that build sets NEXT_PUBLIC_SAVVY_TEST_HOOKS=1.
 * Dev (`next dev`) honors them because NODE_ENV is not production.
 */
export function testQueryHooksEnabled(env = process.env) {
  return env.NODE_ENV !== "production" || env.NEXT_PUBLIC_SAVVY_TEST_HOOKS === "1";
}

// Direct process.env reads so the production client bundle constant-folds this to false.
// A helper that receives process.env as an object stays live in the browser and treats a missing NODE_ENV as enabled.
export const TEST_QUERY_HOOKS =
  process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_SAVVY_TEST_HOOKS === "1";
