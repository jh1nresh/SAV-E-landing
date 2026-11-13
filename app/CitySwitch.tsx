import { hrefWithLang, type SiteLang } from "./site";
import "./city.css";

const CITIES = [
  { id: "taipei", href: "/", zh: "台北", en: "Taipei" },
  { id: "shanghai", href: "/shanghai", zh: "上海", en: "Shanghai" },
] as const;

type CityId = (typeof CITIES)[number]["id"];

export default function CitySwitch({ active, lang }: { active: CityId; lang: SiteLang }) {
  return (
    <div className="city-switch-row">
      <div className="city-switch" role="group" aria-label={lang === "en" ? "City" : "城市"} data-testid="city-switch">
        {CITIES.map((city) => {
          const selected = city.id === active;
          return (
            <a
              key={city.id}
              className="city-switch-item"
              data-testid={`city-switch-${city.id}`}
              href={hrefWithLang(city.href, lang)}
              aria-current={selected ? "page" : undefined}
            >
              <span className="zh">{city.zh}</span>
              <span className="en">{city.en}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
