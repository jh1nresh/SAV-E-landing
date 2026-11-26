/** Structured data uses the same source and anchors as the visible guide. */
export function organizingGuideSchema(guide, origin) {
  const root = `${origin}/zh-tw/guides`;
  const url = `${root}/${guide.slug}`;
  const title = guide.title.replace(/｜Savvy$/, '');
  const publisher = { '@type': 'Organization', '@id': `${origin}/#organization`, name: 'Savvy', url: origin };
  const common = { name: title, description: guide.description, url, inLanguage: 'zh-Hant', dateModified: guide.updatedAt };
  const sections = guide.sections.flatMap((section, sectionIndex) => {
    const steps = section.blocks.flatMap((block, blockIndex) => block.type === 'steps'
      ? (block.items || []).map((text, itemIndex) => ({
          '@type': 'HowToStep', text,
          url: `${url}#instruction-${sectionIndex}-${blockIndex}-${itemIndex}`,
        }))
      : []);
    return steps.length ? [{ '@type': 'HowToSection', name: section.heading, itemListElement: steps }] : [];
  });
  const questions = guide.sections.flatMap(section => section.blocks.flatMap((block, index) => {
    if (block.type !== 'question' || !block.text) return [];
    const paragraphs = [];
    for (const next of section.blocks.slice(index + 1)) {
      if (next.type !== 'paragraph') break;
      if (next.text) paragraphs.push(next.text);
    }
    return paragraphs.length ? [{
      '@type': 'Question', name: block.text,
      acceptedAnswer: { '@type': 'Answer', text: paragraphs.join('\n\n') },
    }] : [];
  }));
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article', '@id': `${url}#article`, ...common,
        headline: title, mainEntityOfPage: url, author: publisher, publisher,
      },
      {
        '@type': 'BreadcrumbList', '@id': `${url}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Savvy', item: `${origin}/` },
          { '@type': 'ListItem', position: 2, name: '收藏整理指南', item: root },
          { '@type': 'ListItem', position: 3, name: title, item: url },
        ],
      },
      ...(sections.length ? [{ '@type': 'HowTo', '@id': `${url}#howto`, ...common, step: sections }] : []),
      ...(questions.length ? [{ '@type': 'FAQPage', '@id': `${url}#faq`, url, inLanguage: 'zh-Hant', mainEntity: questions }] : []),
    ],
  };
}

export const serializeGuideSchema = value => JSON.stringify(value).replace(/</g, '\\u003c');
