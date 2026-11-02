import type { Metadata } from "next";
import SavvyLanding from "./SavvyLanding";
import { SITE_ORIGIN, SITE_DESCRIPTION, PRODUCT_TERMS } from "../lib/site-content";

export const metadata: Metadata = { alternates: { canonical: `${SITE_ORIGIN}/` } };

export default function Home() {
  const identity = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "SoftwareApplication", "@id": `${SITE_ORIGIN}/#app`, name: "Savvy", description: SITE_DESCRIPTION, url: SITE_ORIGIN, operatingSystem: "iOS", applicationCategory: "TravelApplication", keywords: PRODUCT_TERMS.join(", "), publisher: { "@id": `${SITE_ORIGIN}/#organization` } },
      { "@type": "Organization", "@id": `${SITE_ORIGIN}/#organization`, name: "Savvy", url: SITE_ORIGIN, description: "The team behind Savvy's place-memory app and public guides.", contactPoint: { "@type": "ContactPoint", contactType: "customer support", url: `${SITE_ORIGIN}/contact` } },
    ],
  };
  return <>
    <link rel="alternate" type="text/markdown" href={`${SITE_ORIGIN}/index.md`} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(identity).replace(/</g, "\\u003c") }} />
    <SavvyLanding />
  </>;
}
