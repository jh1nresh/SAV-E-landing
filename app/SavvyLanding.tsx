import { AppStoreBadge } from "./SiteChrome";

export default function SavvyLanding() {
  return (
    <main>
      <section className="s1">
        <div className="wrap">
          <div className="txt">
            <h1 className="h zh">
              <span>看到喜歡的存下</span>
              <span className="u">去過的都記得</span>
            </h1>
            <h1 className="h en">
              <span>Save what you love</span>
              <span>
                Remember where <span className="u">you've been</span>
              </span>
            </h1>
            <p className="sub">Savvy: Turn links into pins</p>
            <AppStoreBadge />
          </div>
          <div className="dev">
            <img
              className="zh"
              src="/assets/phones-zh-1.png"
              alt="Savvy 首頁與存地點畫面（英文介面）"
            />
            <img
              className="en"
              src="/assets/phones-en-1.png"
              alt="Savvy home and Save a place screens"
            />
          </div>
        </div>
      </section>

      <section className="s2 rev">
        <div className="wrap">
          <div className="txt">
            <h2 className="h zh">
              <span>去過了蓋個章</span>
              <span className="k u">集滿你的城市</span>
            </h2>
            <h2 className="h en">
              <span>Been there?</span>
              <span className="k u">Stamp it</span>
            </h2>
          </div>
          <div className="dev one">
            <img
              className="zh"
              src="/assets/phones-zh-2.png"
              alt="Savvy 蓋章與護照畫面"
            />
            <img
              className="en"
              src="/assets/phones-en-2.png"
              alt="Savvy stamp and Passport screens"
            />
          </div>
        </div>
      </section>

      <section className="s3">
        <div className="wrap">
          <div className="txt">
            <h2 className="h zh">
              <span>打開地圖都是回憶</span>
              <span className="u">和朋友一起收</span>
            </h2>
            <h2 className="h en">
              <span>Your map of memories</span>
              <span className="u">Collect with friends</span>
            </h2>
          </div>
          <div className="dev">
            <img
              className="zh"
              src="/assets/phones-zh-3.png"
              alt="Savvy 地圖與朋友畫面"
            />
            <img
              className="en"
              src="/assets/phones-en-3.png"
              alt="Savvy map and Friends screens"
            />
          </div>
        </div>
      </section>

      <section className="s4 rev">
        <div className="wrap">
          <div className="txt">
            <h2 className="h zh">
              <span>白天黑夜都好看</span>
              <span>
                想去的<span className="k">無限</span>收藏
              </span>
            </h2>
            <h2 className="h en">
              <span>Day or night</span>
              <span>
                <span className="k">Unlimited</span> saves
              </span>
            </h2>
          </div>
          <div className="dev">
            <img
              className="zh"
              src="/assets/phones-zh-4.png"
              alt="Savvy 深色模式與無限收藏畫面"
            />
            <img
              className="en"
              src="/assets/phones-en-4.png"
              alt="Savvy dark mode and unlimited saves screens"
            />
          </div>
        </div>
      </section>

      <div className="stk">
        <img src="/assets/st-duck.png" alt="烤鴨 duck" />
        <img src="/assets/st-noodle.png" alt="麵碗 noodle" />
        <img src="/assets/st-coffee.png" alt="咖啡杯 coffee" />
        <img src="/assets/st-temple.png" alt="寺廟 temple" />
        <img src="/assets/st-lantern.png" alt="燈籠 lantern" />
        <img src="/assets/st-elephant.png" alt="小象 elephant" />
      </div>

      <div className="fbadge">
        <AppStoreBadge />
      </div>
    </main>
  );
}
