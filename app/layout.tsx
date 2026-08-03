import type { Metadata } from "next";
import { Gantari } from "next/font/google";
import "./globals.css";

const gantari = Gantari({
  subsets: ["latin"],
  variable: "--font-gantari",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SAV-E | Save the place. Keep the story.",
  description:
    "Turn links from friends, maps, and social posts into private place memories you can confirm, remember, and revisit.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={gantari.variable}>
      <body>{children}</body>
    </html>
  );
}
