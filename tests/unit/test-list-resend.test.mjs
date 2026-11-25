import assert from "node:assert/strict";
import test from "node:test";
import { registerForTesting, testListConfig } from "../../lib/test-list-resend.mjs";

const config = { apiKey: "test-key", from: "Savvy <onboarding@resend.dev>", segment: "savvy-beta-fixture" };
const email = "test+beta@example.com";

function fakeResend({ existing = false, emailStatus = 200, writeStatus = 200 } = {}) {
  let contact = existing, member = false, marker;
  const calls = [];
  const request = async (url, options) => {
    assert.equal(new URL(url).origin, "https://api.resend.com");
    const path = new URL(url).pathname;
    const body = options.body ? JSON.parse(options.body) : null;
    calls.push({ path, method: options.method, body, key: options.headers["Idempotency-Key"] });
    if (options.method === "GET" && path === `/contacts/${encodeURIComponent(email)}`) {
      return contact ? Response.json({ properties: marker ? { savvy_test_confirmation: { value: marker } } : {} })
        : Response.json({}, { status: 404 });
    }
    if (path === "/contacts" && options.method === "POST") {
      assert.deepEqual(body, { email, segments: [{ id: config.segment }] });
      contact = member = true;
      return Response.json({ id: "test-contact" }, { status: 201 });
    }
    if (path.endsWith(`/segments/${config.segment}`)) {
      assert.ok(contact);
      member = true;
      return Response.json({ id: "test-contact" });
    }
    if (path === "/emails") {
      assert.ok(member && marker?.startsWith("pending/"), "save the signup and retry window before requesting confirmation");
      assert.equal(body.from, config.from);
      assert.deepEqual(body.to, [email]);
      assert.match(body.text, /開放試用時/);
      assert.match(body.html, /cid:savvy-sakura/);
      assert.equal(body.attachments[0].content_id, "savvy-sakura");
      assert.equal(Buffer.from(body.attachments[0].content, "base64").subarray(0, 6).toString(), "GIF89a");
      return Response.json({ id: "accepted-message" }, { status: emailStatus });
    }
    assert.equal(options.method, "PATCH");
    const next = body.properties.savvy_test_confirmation;
    assert.ok(next === config.segment || next.startsWith(`pending/${config.segment}/`));
    const status = next === config.segment ? writeStatus : 200;
    if (status === 200) marker = next;
    return Response.json({ id: "test-contact" }, { status });
  };
  return { request, calls, removeFromSegment: () => { member = false; }, isMember: () => member };
}

test("missing configuration leaves sending unavailable", () => {
  assert.equal(testListConfig({ RESEND_API_KEY: "test" }), null);
});

test("stores a new signup, sends the Sakura confirmation, and skips a recorded duplicate", async () => {
  const { request, calls } = fakeResend();
  assert.equal(await registerForTesting(email, config, request), "confirmed");
  assert.equal(await registerForTesting(email, config, request), "confirmed");
  assert.equal(calls.filter(call => call.path === "/emails").length, 1);
  assert.equal(calls.filter(call => call.path === "/contacts").length, 1);
});

test("accepts an existing contact into the test segment without updating global unsubscribe state", async () => {
  const { request, calls } = fakeResend({ existing: true });
  assert.equal(await registerForTesting(email, config, request), "confirmed");
  assert.ok(calls.some(call => call.path.endsWith(`/segments/${config.segment}`)));
  assert.ok(calls.every(call => !call.body || !Object.hasOwn(call.body, "unsubscribed")));
});

test("restores segment membership on a fresh signup without resending the confirmation", async () => {
  const { request, calls, removeFromSegment, isMember } = fakeResend();
  assert.equal(await registerForTesting(email, config, request), "confirmed");
  removeFromSegment();
  assert.equal(await registerForTesting(email, config, request), "confirmed");
  assert.ok(isMember());
  assert.equal(calls.filter(call => call.path === "/emails").length, 1);
});

test("keeps a retryable signup if Resend rejects the confirmation", async () => {
  const rejected = fakeResend({ emailStatus: 429 });
  assert.equal(await registerForTesting(email, config, rejected.request), "confirmation_pending");
  assert.ok(rejected.calls.every(call => call.body?.properties?.savvy_test_confirmation !== config.segment));
});

test("reports known acceptance and never retries an unrecorded send after the idempotency window", async () => {
  const unrecorded = fakeResend({ writeStatus: 503 });
  const initial = Date.UTC(2026, 10, 25);
  const signup = (hours) => registerForTesting(email, config, unrecorded.request, () => initial + hours * 3_600_000);
  assert.equal(await signup(0), "confirmed");
  assert.equal(await signup(1), "confirmed");
  assert.equal(await signup(25), "confirmation_unknown");
  const keys = unrecorded.calls.filter(call => call.path === "/emails").map(call => call.key);
  assert.deepEqual(keys, [keys[0], keys[0]]);
  assert.match(keys[0], /^savvy-test-list\/[a-f0-9]{64}$/);
});
