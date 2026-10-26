import type { Metadata } from "next";
import "./globals.css";
import { SiteChrome } from "./SiteChrome";
import { LANG_BOOT_SCRIPT } from "./site";

export const metadata: Metadata = {
  metadataBase: new URL("https://sav-e-landing.vercel.app"),
  title: "Savvy: Turn links into pins",
  description:
    "Savvy turns links into pins. Free keeps 50 saved places. Pro is unlimited saved places.",
  openGraph: {
    title: "Savvy: Turn links into pins",
    description:
      "Savvy turns links into pins. Free keeps 50 saved places. Pro is unlimited saved places.",
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
    title: "Savvy: Turn links into pins",
    description:
      "Savvy turns links into pins. Free keeps 50 saved places. Pro is unlimited saved places.",
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
        <link
          rel="preload"
          href="/assets/fonts/Iansui-SavvySubset.ttf"
          as="font"
          type="font/ttf"
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
