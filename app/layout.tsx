import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SAV-E | Your Private Place Memory App",
  description:
    "Download SAV-E on TestFlight and turn Reels, Maps links, screenshots, and friend tips into private, source-backed place memory.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Almarai:wght@300;400;700;800&family=Instrument+Serif:ital@1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
