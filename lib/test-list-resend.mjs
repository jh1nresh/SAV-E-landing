import { createHash } from "node:crypto";
import { confirmationHtml, confirmationSubject, confirmationText } from "./test-list-email.mjs";
import sakura from "./test-list-sakura.json" with { type: "json" };

const acceptedProperty = "savvy_test_confirmation";
// Resend retains send idempotency keys for 24 hours. Leave room for clock skew.
const safeRetryWindow = 23 * 60 * 60 * 1000;

export function testListConfig(env) {
  const apiKey = env.RESEND_API_KEY?.trim();
  const from = env.SAVVY_TEST_LIST_FROM?.trim();
  const segment = env.SAVVY_TEST_LIST_SEGMENT?.trim();
  return apiKey && from && segment ? { apiKey, from, segment } : null;
}

export async function registerForTesting(email, config, request = fetch, now = Date.now) {
  const path = `/contacts/${encodeURIComponent(email)}`;
  async function resend(path, method = "GET", body, idempotencyKey) {
    const headers = { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" };
    if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
    return request(`https://api.resend.com${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
  }

  let contact = await resend(path);
  if (contact.status === 404) {
    const created = await resend("/contacts", "POST", { email, segments: [{ id: config.segment }] });
    if (!created.ok) {
      if (![409, 422].includes(created.status)) throw new Error("contact_create");
      // A parallel submit can create the contact between the lookup and insert.
      contact = await resend(path);
      if (!contact.ok) throw new Error("contact_create");
    }
  }

  const pendingPrefix = `pending/${config.segment}/`;
  let pendingSince = null;
  if (contact.ok) {
    const profile = await contact.json();
    const marker = profile.properties?.[acceptedProperty]?.value;
    const membership = `${path}/segments`;
    const added = await resend(`${membership}/${encodeURIComponent(config.segment)}`, "POST");
    if (!added.ok) {
      const memberships = await resend(membership);
      if (!memberships.ok || !(await memberships.json()).data?.some(item => item.id === config.segment)) {
        throw new Error("segment_add");
      }
    }
    if (marker === config.segment) return "confirmed";
    if (typeof marker === "string" && marker.startsWith(pendingPrefix)) pendingSince = Number(marker.slice(pendingPrefix.length));
  } else if (contact.status !== 404) {
    throw new Error("contact_lookup");
  }

  try {
    if (pendingSince === null) {
      // Reserve a retry window before sending. A timed-out or unrecorded send
      // may have reached Resend, so it must never be replayed outside that window.
      const pending = await resend(path, "PATCH", { properties: { [acceptedProperty]: pendingPrefix + now() } });
      if (!pending.ok) return "confirmation_pending";
    } else if (!Number.isSafeInteger(pendingSince) || now() - pendingSince >= safeRetryWindow) {
      return "confirmation_unknown";
    }
    const digest = createHash("sha256").update(`${config.segment}/${email}`).digest("hex");
    const receipt = await resend("/emails", "POST", {
      from: config.from,
      to: [email],
      subject: confirmationSubject,
      html: confirmationHtml(),
      text: confirmationText,
      attachments: [{ filename: "savvy-sakura.gif", content: sakura, content_id: "savvy-sakura" }],
    }, `savvy-test-list/${digest}`);
    if (!receipt.ok || !(await receipt.json()).id) return "confirmation_pending";
    await resend(path, "PATCH", { properties: { [acceptedProperty]: config.segment } }).catch(() => {});
    return "confirmed";
  } catch {
    return "confirmation_pending";
  }
}
