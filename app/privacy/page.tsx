import type { Metadata } from "next";
import { SUPPORT_EMAIL } from "../site";

export const metadata: Metadata = {
  title: "Savvy Privacy Policy",
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
      <p className="zh">
        問題請寄{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>。
      </p>
      <p className="en">
        Questions: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
    </main>
  );
}
