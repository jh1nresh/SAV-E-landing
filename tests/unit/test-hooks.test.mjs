import assert from "node:assert/strict";
import test from "node:test";
import { testQueryHooksEnabled } from "../../lib/test-hooks.mjs";

test("production ignores clock and pickerFixture query hooks", () => {
  assert.equal(testQueryHooksEnabled({ NODE_ENV: "production" }), false);
  assert.equal(testQueryHooksEnabled({ NODE_ENV: "production", NEXT_PUBLIC_SAVVY_TEST_HOOKS: "" }), false);
});

test("dev and the explicit test build honor the query hooks", () => {
  assert.equal(testQueryHooksEnabled({ NODE_ENV: "development" }), true);
  assert.equal(testQueryHooksEnabled({ NODE_ENV: "test" }), true);
  assert.equal(testQueryHooksEnabled({ NODE_ENV: "production", NEXT_PUBLIC_SAVVY_TEST_HOOKS: "1" }), true);
});
