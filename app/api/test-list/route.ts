import { confirmationHtml } from "../../../lib/test-list-email.mjs";
import { registerForTesting, testListConfig } from "../../../lib/test-list-resend.mjs";
import sakura from "../../../lib/test-list-sakura.json";

const preview = () => process.env.NODE_ENV === "development" && process.env.SAVVY_TEST_LIST_PREVIEW === "1";
const noStore = { "Cache-Control": "private, no-store" };
const recent = new Map<string, { count: number; expires: number }>();

async function readSignup(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const decoder = new TextDecoder();
  let bytes = 0;
  let content = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) return JSON.parse(content + decoder.decode());
      bytes += value.byteLength;
      if (bytes > 1024) {
        await reader.cancel();
        return null;
      }
      content += decoder.decode(value, { stream: true });
    }
  } catch {
    return null;
  }
}

function allowedRequest(ip: string) {
  const now = Date.now();
  for (const [key, entry] of recent) if (entry.expires <= now) recent.delete(key);
  const entry = recent.get(ip);
  if (entry) return ++entry.count <= 6;
  if (recent.size >= 1000) return false;
  recent.set(ip, { count: 1, expires: now + 60_000 });
  return true;
}

export function GET(request: Request) {
  if (!preview() || new URL(request.url).searchParams.get("preview") !== "email") {
    return new Response(null, { status: 405, headers: { ...noStore, Allow: "POST" } });
  }
  return new Response(confirmationHtml(`data:image/gif;base64,${sakura}`), {
    headers: { ...noStore, "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex" },
  });
}

export async function POST(request: Request) {
  const json = (state: string, status = 200) => Response.json({ state }, { status, headers: noStore });
  // Next can normalize the request URL to localhost even when the browser used 127.0.0.1.
  const host = request.headers.get("Host");
  const scheme = process.env.VERCEL === "1" ? "https:" : new URL(request.url).protocol;
  if (!host || request.headers.get("Origin") !== `${scheme}//${host}`) return json("unavailable", 403);
  if (request.headers.get("Content-Type")?.split(";")[0] !== "application/json") return json("invalid", 415);
  const input = await readSignup(request);
  const email = typeof input?.email === "string" ? input.email.trim().toLowerCase() : "";
  if (email.length > 254 || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(email)) return json("invalid", 400);
  if (preview()) return json("preview");
  const config = testListConfig(process.env);
  if (!config) return json("unavailable", 503);
  const ip = request.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (!allowedRequest(ip)) return json("slow_down", 429);
  try {
    return json(await registerForTesting(email, config));
  } catch {
    return json("unavailable", 503);
  }
}
