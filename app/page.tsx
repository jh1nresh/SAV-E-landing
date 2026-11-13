import type { Metadata } from "next";
import { taipeiDate } from "../lib/metro-logic.mjs";
import SavvyLanding from "./SavvyLanding";
import { SITE_DESCRIPTION_ZH, SITE_TITLE_ZH } from "./site";
import { PRODUCT_TERMS, SCHEMA_DESCRIPTION, SITE_ORIGIN } from "../lib/site-content";

// Static metadata. `?lang=en` updates the title and description in the head
// boot script, so this page does not read search params.
export const metadata: Metadata = {
  title: SITE_TITLE_ZH,
  description: SITE_DESCRIPTION_ZH,
  alternates: { canonical: `${SITE_ORIGIN}/`, types: { "text/markdown": `${SITE_ORIGIN}/index.md` } },
  openGraph: {
    title: SITE_TITLE_ZH,
    description: SITE_DESCRIPTION_ZH,
    url: SITE_ORIGIN,
    siteName: "Savvy",
    locale: "zh_Hant_TW",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Savvy" }],
  },
  twitter: { card: "summary_large_image", title: SITE_TITLE_ZH, description: SITE_DESCRIPTION_ZH, images: ["/og.png"] },
};

export default function Home() {
  // Today's date is fixed when this static page is built. The live map recomputes NEW in the browser.
  // ?clock= and ?pickerFixture= are not read here; a dynamic read would opt the homepage out of static rendering.
  const clock = taipeiDate();
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
    <SavvyLanding clock={clock} />
  </>;
}
