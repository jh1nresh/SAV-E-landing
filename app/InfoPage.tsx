import { infoPages, SITE_ORIGIN } from "../lib/site-content";

export function infoMetadata(key: keyof typeof infoPages) {
  const { title, description } = infoPages[key];
  return { title, description, alternates: { canonical: `${SITE_ORIGIN}/${key}`, types: { "text/markdown": `${SITE_ORIGIN}/${key}.md` } }, openGraph: { title, description, url: `${SITE_ORIGIN}/${key}`, type: "website", images: [{ url: "/og.png", width: 1200, height: 630, alt: "Savvy" }] } };
}

export function InfoPage({ name }: { name: keyof typeof infoPages }) {
  const page = infoPages[name];
  return <main className="legal" lang="en">
    <h1 className="h">{page.title}</h1>
    {page.sections.map(section => <div key={section.heading}>
      <h2>{section.heading}</h2><p>{section.text}</p>
    </div>)}
    <p><a href="/support">Savvy Support</a> · <a href="/privacy">Privacy</a> · <a href="/zh-tw/guides">繁體中文指南</a> · <a href="/llms.txt">Agent instructions</a></p>
    {name === "docs" && <>
      <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}><code>{`curl -i -H 'Accept: text/markdown' ${SITE_ORIGIN}/`}</code></pre>
      <p><a href="https://github.com/jh1nresh/SAV-E-landing">SAV-E-landing on GitHub</a></p>
    </>}
  </main>;
}
