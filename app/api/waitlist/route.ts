import { configuredBackends, normalizeEmail, persistWaitlistEmail } from "../../lib/waitlist";

export const runtime = "nodejs";

const hits = new Map<string, { count: number; resetAt: number }>();

function clientKey(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local"
  );
}

function rateLimited(key: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const current = hits.get(key);
  if (!current || current.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  current.count += 1;
  return current.count > 12;
}

export async function GET() {
  const backends = configuredBackends();
  return Response.json({
    ok: true,
    configured: backends.length > 0,
    backends: backends.map((name) => (name === "form" ? "form" : name)),
  });
}

export async function POST(request: Request) {
  if (rateLimited(clientKey(request))) {
    return Response.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  if (typeof payload.website === "string" && payload.website.trim()) {
    return Response.json({ ok: true });
  }

  const email = normalizeEmail(payload.email);
  if (!email) {
    return Response.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }

  try {
    const { backend } = await persistWaitlistEmail(email);
    return Response.json({ ok: true, backend });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "store_failed";
    if (reason === "unconfigured") {
      return Response.json({ ok: false, error: "unconfigured" }, { status: 503 });
    }
    return Response.json({ ok: false, error: "store_failed" }, { status: 502 });
  }
}
