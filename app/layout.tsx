import type { Metadata } from "next";
import "./globals.css";
import { SiteChrome } from "./SiteChrome";
import { LANG_BOOT_SCRIPT } from "./site";
import { SITE_ORIGIN, SITE_TITLE, SITE_DESCRIPTION, PRODUCT_TERMS } from "../lib/site-content";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: SITE_TITLE,
  description:
    SITE_DESCRIPTION,
  keywords: [...PRODUCT_TERMS],
  openGraph: {
    title: SITE_TITLE,
    description:
      SITE_DESCRIPTION,
    url: SITE_ORIGIN,
    siteName: "Savvy",
    locale: "zh_Hant_TW",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Savvy",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description:
      SITE_DESCRIPTION,
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant" suppressHydrationWarning>
      <head>
        <link rel="describedby" href="/llms.txt" />
        <link
          rel="preload"
          href="/assets/fonts/Iansui-SavvySubset.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/assets/fonts/Caveat-SemiBold.ttf"
          as="font"
          type="font/ttf"
          crossOrigin="anonymous"
        />
        <script dangerouslySetInnerHTML={{ __html: LANG_BOOT_SCRIPT }} />
      </head>
      <body>
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
