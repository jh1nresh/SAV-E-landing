import type { Metadata } from "next";
import CitySelect from "./CitySelect";
import {
  parseSiteLang,
} from "./site";
import { PRODUCT_TERMS, SCHEMA_DESCRIPTION, SITE_ORIGIN } from "../lib/site-content";

const TITLE_ZH = "先選城市｜Savvy";
const TITLE_EN = "Pick a city｜Savvy";
const DESCRIPTION_ZH = "台北與上海並列。先選一座城市，再看這一站的捷運美食。";
const DESCRIPTION_EN = "Taipei and Shanghai, side by side. Pick a city, then eat one metro stop at a time.";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}): Promise<Metadata> {
  const { lang } = await searchParams;
  const en = parseSiteLang(lang) === "en";
  const title = en ? TITLE_EN : TITLE_ZH;
  const description = en ? DESCRIPTION_EN : DESCRIPTION_ZH;
  return {
    title,
    description,
    alternates: { canonical: `${SITE_ORIGIN}/`, types: { "text/markdown": `${SITE_ORIGIN}/index.md` } },
    openGraph: {
      title,
      description,
      url: SITE_ORIGIN,
      siteName: "Savvy",
      locale: en ? "en" : "zh_Hant_TW",
      type: "website",
      images: [{ url: "/og.png", width: 1200, height: 630, alt: "Savvy" }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
  };
}

export default function Home() {
  const identity = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "SoftwareApplication", "@id": `${SITE_ORIGIN}/#app`, name: "Savvy", description: SCHEMA_DESCRIPTION, url: SITE_ORIGIN, operatingSystem: "iOS", applicationCategory: "LifestyleApplication", keywords: PRODUCT_TERMS.join(", "), publisher: { "@id": `${SITE_ORIGIN}/#organization` } },
      { "@type": "Organization", "@id": `${SITE_ORIGIN}/#organization`, name: "Savvy", url: SITE_ORIGIN, description: "The team behind Savvy's place-memory app and public guides.", contactPoint: { "@type": "ContactPoint", contactType: "customer support", url: `${SITE_ORIGIN}/contact` } },
    ],
  };
  return <>
    <link rel="alternate" type="text/markdown" href={`${SITE_ORIGIN}/index.md`} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(identity).replace(/</g, "\\u003c") }} />
    <CitySelect />
  </>;
}
