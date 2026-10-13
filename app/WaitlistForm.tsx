"use client";

import { FormEvent, useState } from "react";

type Status = "idle" | "submitting" | "success" | "error";

export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setMessage("");

    const form = new FormData(event.currentTarget);
    const website = String(form.get("website") ?? "");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, website }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };

      if (res.ok && data.ok) {
        setStatus("success");
        setMessage("Memo has your note. We will write when Savvy is ready.");
        setEmail("");
        return;
      }

      setStatus("error");
      if (data.error === "unconfigured") {
        setMessage("Waitlist storage is not connected yet. Set WAITLIST_FORM_URL.");
      } else if (data.error === "invalid_email") {
        setMessage("That email does not look right.");
      } else if (data.error === "rate_limited") {
        setMessage("Too many tries from this place. Come back in a bit.");
      } else {
        setMessage("Memo could not keep this note. Try again.");
      }
    } catch {
      setStatus("error");
      setMessage("Memo could not keep this note. Try again.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-3">
      <label className="atlas-eyebrow" htmlFor="waitlist-email">
        Email waitlist
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="waitlist-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder="you@place.memory"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="min-h-12 flex-1 rounded-[14px] border border-line/70 bg-paper px-4 text-[16px] font-medium text-ink outline-none placeholder:text-muted/70 focus-visible:ring-4 focus-visible:ring-coral/25"
        />
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="hidden"
        />
        <button
          type="submit"
          disabled={status === "submitting"}
          className="atlas-strong inline-flex min-h-12 items-center justify-center rounded-[14px] bg-coral px-5 text-white transition-transform active:scale-[0.98] disabled:opacity-70"
        >
          {status === "submitting" ? "Keeping note…" : "Join the waitlist"}
        </button>
      </div>
      {message ? (
        <p
          role="status"
          className={status === "success" ? "text-sm font-medium text-forest" : "text-sm font-medium text-coral"}
        >
          {message}
        </p>
      ) : (
        <p className="text-sm font-medium text-muted">
          Memo writes when the invite is ready. No marketplace, no bot seat.
        </p>
      )}
    </form>
  );
}
