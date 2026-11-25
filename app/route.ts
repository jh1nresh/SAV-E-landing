import { readFileSync } from "node:fs";
import { join } from "node:path";

const workspace = readFileSync(join(process.cwd(), "public/trips/index.html"), "utf8");

// The same path also serves Markdown through proxy.ts. Keep it out of
// shared caches so a client never gets the wrong representation.
export function GET() {
  return new Response(workspace, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
      "Vary": "Accept",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
