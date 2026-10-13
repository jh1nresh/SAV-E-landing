import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Savvy | Place memory, from a link to a Map Stamp",
  description:
    "Savvy turns an Instagram Reel or place link into a Map Stamp on your map. Memo keeps the Source Clue. Free, or Pro $6.99/mo.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
