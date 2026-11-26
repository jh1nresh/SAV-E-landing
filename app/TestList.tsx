"use client";

import { useRef, useState, type FormEvent } from "react";
import "./test-list.css";

const feedback: Record<string, [string, string]> = {
  submitting: ["正在提交報名…", "Submitting your signup…"],
  confirmed: ["已收到報名。開放試用時，我們會寄信通知你。", "You’re signed up. We’ll email you when early access opens."],
  confirmation_pending: ["已收到報名。暫時無法確認寄信結果，你可以稍後重試。", "We received your signup. We couldn’t confirm the email status. You can try again later."],
  confirmation_unknown: ["已收到報名。如果沒收到確認信，請聯絡 Savvy。", "We received your signup. Contact Savvy if you didn’t receive a confirmation email."],
  preview: ["已完成本機測試，沒有寄出 Email。", "Local test complete. No email was sent."],
  invalid: ["請確認 Email 格式後再送出。", "Check your email address and try again."],
  slow_down: ["提交次數過多，請稍候一分鐘再試。", "Too many attempts. Please try again in a minute."],
  unavailable: ["暫時無法完成報名，請稍後再試。", "We couldn’t complete the signup. Please try again later."],
};

function Copy({ zh, en }: { zh: string; en: string }) {
  return <><span className="zh" lang="zh-Hant">{zh}</span><span className="en" lang="en">{en}</span></>;
}

export default function TestList() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, setState] = useState("");
  const busy = state === "submitting";
  const message = feedback[state];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const email = String(new FormData(form).get("email") ?? "");
    setState("submitting");
    try {
      const response = await fetch(form.action, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        signal: AbortSignal.timeout(30_000),
      });
      const result = await response.json();
      const status = typeof result.state === "string" && Object.hasOwn(feedback, result.state) ? result.state : "unavailable";
      setState(status);
      if (["confirmed", "preview"].includes(status)) form.reset();
    } catch {
      setState("unavailable");
    }
  }

  return <>
    <button className="test-list-launch" type="button" aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}>
      <Copy zh="加入測試名單" en="Get early access" />
    </button>
    <dialog ref={dialog} className="test-list-dialog" aria-labelledby="test-list-title">
      <h2 id="test-list-title"><Copy zh="加入 Savvy 測試名單" en="Savvy early access" /></h2>
      <p id="test-list-about"><Copy zh="留下 Email，開放試用時我們會通知你。" en="Leave your email and we’ll let you know when testing opens." /> <a href="/privacy"><Copy zh="隱私權政策" en="Privacy policy" /></a></p>
      <form method="post" action="/api/test-list" onSubmit={submit} aria-labelledby="test-list-title">
        <label htmlFor="test-list-email">Email</label>
        <input id="test-list-email" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false}
          maxLength={254} required autoFocus readOnly={busy} aria-describedby="test-list-about"
          aria-invalid={state === "invalid" || undefined} onInput={() => { if (!busy && state) setState(""); }} />
        <div className="test-list-actions">
          <button type="button" onClick={() => dialog.current?.close()}><Copy zh="關閉" en="Close" /></button>
          <button className="test-list-launch" type="submit" disabled={busy || ["confirmed", "confirmation_unknown"].includes(state)}>
            <Copy zh="加入測試名單" en="Get early access" />
          </button>
        </div>
      </form>
      <div className="test-list-feedback" role="status">
        {message && <Copy zh={message[0]} en={message[1]} />}
        {state === "preview" && <> <a href="/api/test-list?preview=email"><Copy zh="查看確認信" en="Preview the confirmation email" /></a></>}
        {state === "confirmation_unknown" && <> <a href="/contact"><Copy zh="聯絡 Savvy" en="Contact Savvy" /></a></>}
      </div>
    </dialog>
  </>;
}
