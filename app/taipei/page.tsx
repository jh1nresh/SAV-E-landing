import type { Metadata } from "next";
import SavvyLanding from "../SavvyLanding";
import {
  SITE_DESCRIPTION_EN,
  SITE_DESCRIPTION_ZH,
  SITE_TITLE_EN,
  SITE_TITLE_ZH,
  parseSiteLang,
} from "../site";
import { PRODUCT_TERMS, SCHEMA_DESCRIPTION, SITE_ORIGIN } from "../../lib/site-content";

const TAIPEI_PATH = "/taipei";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}): Promise<Metadata> {
  const { lang } = await searchParams;
  const en = parseSiteLang(lang) === "en";
  const title = en ? SITE_TITLE_EN : SITE_TITLE_ZH;
  const description = en ? SITE_DESCRIPTION_EN : SITE_DESCRIPTION_ZH;
  const url = `${SITE_ORIGIN}${TAIPEI_PATH}`;
  return {
    title,
    description,
    alternates: { canonical: url, types: { "text/markdown": `${url}.md` } },
    openGraph: {
      title,
      description,
      url,
      siteName: "Savvy",
      locale: en ? "en" : "zh_Hant_TW",
      type: "website",
      images: [{ url: "/og.png", width: 1200, height: 630, alt: "Savvy" }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
  };
}

export default function TaipeiPage() {
  const identity = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "SoftwareApplication", "@id": `${SITE_ORIGIN}/#app`, name: "Savvy", description: SCHEMA_DESCRIPTION, url: SITE_ORIGIN, operatingSystem: "iOS", applicationCategory: "LifestyleApplication", keywords: PRODUCT_TERMS.join(", "), publisher: { "@id": `${SITE_ORIGIN}/#organization` } },
      { "@type": "Organization", "@id": `${SITE_ORIGIN}/#organization`, name: "Savvy", url: SITE_ORIGIN, description: "The team behind Savvy's place-memory app and public guides.", contactPoint: { "@type": "ContactPoint", contactType: "customer support", url: `${SITE_ORIGIN}/contact` } },
    ],
  };
  return <>
    <link rel="alternate" type="text/markdown" href={`${SITE_ORIGIN}${TAIPEI_PATH}.md`} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(identity).replace(/</g, "\\u003c") }} />
    <SavvyLanding />
  </>;
}
