import type { Metadata } from "next";
import { resolveClock } from "../lib/metro";
import SavvyLanding from "./SavvyLanding";
import {
  SITE_DESCRIPTION_EN,
  SITE_DESCRIPTION_ZH,
  SITE_TITLE_EN,
  SITE_TITLE_ZH,
  parseSiteLang,
} from "./site";
import { PRODUCT_TERMS, SCHEMA_DESCRIPTION, SITE_ORIGIN } from "../lib/site-content";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}): Promise<Metadata> {
  const { lang } = await searchParams;
  const en = parseSiteLang(lang) === "en";
  const title = en ? SITE_TITLE_EN : SITE_TITLE_ZH;
  const description = en ? SITE_DESCRIPTION_EN : SITE_DESCRIPTION_ZH;
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

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ clock?: string; pickerFixture?: string }>;
}) {
  const params = await searchParams;
  const fixture = Number(params.pickerFixture);
  const clock = resolveClock(params.clock);
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
    <SavvyLanding clock={clock} pickerFixture={Number.isFinite(fixture) && fixture > 0 ? fixture : undefined} />
  </>;
}
