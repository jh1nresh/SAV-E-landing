import type { Metadata } from "next";
import { SUPPORT_EMAIL, TESTFLIGHT_URL } from "../site";

export const metadata: Metadata = {
  title: "Savvy Support",
};

export default function SupportPage() {
  return (
    <main className="legal">
      <h1 className="h zh">Savvy 支援</h1>
      <h1 className="h en">Savvy Support</h1>
      <p className="zh">
        需要幫忙？請寄信到{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>。
      </p>
      <p className="en">
        Need help? Email{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
      <p className="zh">
        公開 TestFlight：{" "}
        <a
          href={TESTFLIGHT_URL}
          data-swap="appstore-url"
          target="_blank"
          rel="noopener noreferrer"
        >
          {TESTFLIGHT_URL}
        </a>
      </p>
      <p className="en">
        Public TestFlight:{" "}
        <a
          href={TESTFLIGHT_URL}
          data-swap="appstore-url"
          target="_blank"
          rel="noopener noreferrer"
        >
          {TESTFLIGHT_URL}
        </a>
      </p>
    </main>
  );
}
