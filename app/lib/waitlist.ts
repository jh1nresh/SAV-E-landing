import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  if (email.length < 3 || email.length > 254 || !EMAIL_RE.test(email)) {
    return null;
  }
  return email;
}

export function configuredBackends(): string[] {
  const backends: string[] = [];
  if (process.env.WAITLIST_FORM_URL?.trim()) backends.push("form");
  if (process.env.WAITLIST_LOCAL_PATH?.trim()) backends.push("local");
  if (process.env.NODE_ENV !== "production") backends.push("local-dev");
  return backends;
}

export async function persistWaitlistEmail(email: string): Promise<{ backend: string }> {
  const formUrl = process.env.WAITLIST_FORM_URL?.trim();
  if (formUrl) {
    if (!/^https:\/\//i.test(formUrl)) {
      throw new Error("invalid_form_url");
    }
    const res = await fetch(formUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        source: "savvy-landing",
        _subject: "Savvy waitlist",
      }),
    });
    if (!res.ok) {
      throw new Error("form_upstream");
    }
    return { backend: "form" };
  }

  const localPath = process.env.WAITLIST_LOCAL_PATH?.trim();
  if (localPath || process.env.NODE_ENV !== "production") {
    const file = localPath || ".data/waitlist.jsonl";
    await mkdir(dirname(file), { recursive: true });
    await appendFile(
      file,
      `${JSON.stringify({ email, createdAt: new Date().toISOString() })}\n`,
      "utf8",
    );
    return { backend: "local" };
  }

  throw new Error("unconfigured");
}
