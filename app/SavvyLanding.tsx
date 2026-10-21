import { AppStoreBadge } from "./SiteChrome";

export default function SavvyLanding() {
  return (
    <main>
      <section>
        <div className="wrap">
          <div className="txt">
            <h1 className="h zh">
              你去過的地方，
              <br />
              都記得
            </h1>
            <h1 className="h en">
              Every place,
              <br />
              remembered
            </h1>
            <p className="sub">Savvy: Turn links into pins</p>
            <AppStoreBadge />
          </div>
          <div className="dev">
            <img src="/assets/phones-1.png" alt="Savvy iPhone screens" />
          </div>
        </div>
      </section>

      <section>
        <div className="wrap rev">
          <div className="txt">
            <h2 className="h zh">
              去過了蓋個章
              <br />
              集滿你的城市
            </h2>
            <h2 className="h en">
              Been there?
              <br />
              Stamp it
            </h2>
          </div>
          <div className="dev">
            <img src="/assets/phones-2.png" alt="Savvy iPhone screens" />
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="txt">
            <h2 className="h zh">
              打開地圖
              <br />
              都是回憶
            </h2>
            <h2 className="h en">
              Your map
              <br />
              of memories
            </h2>
          </div>
          <div className="dev narrow">
            <img src="/assets/phones-3.png" alt="Savvy iPhone screens" />
          </div>
        </div>
      </section>

      <section>
        <div className="wrap rev">
          <div className="txt">
            <h2 className="h zh">
              想去的地方
              <br />
              無限收藏
            </h2>
            <h2 className="h en">
              Every place you want
              <br />
              Unlimited
            </h2>
          </div>
          <div className="dev">
            <img src="/assets/phones-4.png" alt="Savvy iPhone screens" />
          </div>
        </div>
        <p className="sub plan zh">免費：50 個收藏地點 · Pro：無限</p>
        <p className="sub plan en">Free: 50 saved places · Pro: unlimited</p>
      </section>

      <section className="stk">
        <div className="panel">
          <img src="/assets/st-duck.png" alt="烤鴨 duck" />
          <img src="/assets/st-noodle.png" alt="麵碗 noodle" />
          <img src="/assets/st-coffee.png" alt="咖啡杯 coffee" />
          <img src="/assets/st-temple.png" alt="寺廟 temple" />
          <img src="/assets/st-lantern.png" alt="燈籠 lantern" />
          <img src="/assets/st-elephant.png" alt="小象 elephant" />
        </div>
      </section>

      <div className="fbadge">
        <AppStoreBadge />
      </div>
    </main>
  );
}
