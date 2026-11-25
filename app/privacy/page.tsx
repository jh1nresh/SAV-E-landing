import type { Metadata } from "next";
import { SUPPORT_EMAIL } from "../site";
import { privacyGuidance, SITE_ORIGIN } from "../../lib/site-content";

export const metadata: Metadata = {
  title: "Savvy Privacy Policy",
  alternates: { canonical: `${SITE_ORIGIN}/privacy` },
};

export default function PrivacyPage() {
  return (
    <main className="legal">
      <h1 className="h zh">Savvy 隱私權政策</h1>
      <h1 className="h en">Savvy Privacy Policy</h1>
      <p className="zh">
        Savvy 是你的私人地點記憶。你確認後收藏的地方，預設只屬於你。我們不會把你的地圖當成商品販售。
      </p>
      <p className="en">
        Savvy is your private place memory. Places you confirm and save stay
        yours by default. We do not sell your map.
      </p>
      <p className="zh">免費方案可收藏 50 個地點；Pro 可無限收藏。</p>
      <p className="en">
        Free keeps 50 saved places. Pro is unlimited saved places.
      </p>
      <p className="zh">報名 Savvy 測試時，我們使用 Resend 儲存你填寫的 Email、寄出報名確認和試用邀請。你可以聯絡我們移除報名資料。</p>
      <p className="en">When you sign up for the Savvy beta, we use Resend to store your email address and send your confirmation and testing invitation. Contact us to have your signup removed.</p>
      <p className="zh">
        問題請寄{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>。
      </p>
      <p className="en">
        Questions: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
      <div lang="en">{privacyGuidance.map(section => <div key={section.heading}><h2>{section.heading}</h2><p>{section.text}</p></div>)}</div>
    </main>
  );
}
