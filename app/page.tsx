import type { Metadata } from "next";
import SavvyLanding from "./SavvyLanding";

export const metadata: Metadata = { alternates: { canonical: "https://sav-e-landing.vercel.app/" } };

export default function Home() {
  return <SavvyLanding />;
}
