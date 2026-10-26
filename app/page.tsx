import SavvyLanding from "./SavvyLanding";
import { parseSiteLang } from "./site";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string | string[] }>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.lang) ? params.lang[0] : params.lang;
  return <SavvyLanding initialLang={parseSiteLang(raw)} />;
}
