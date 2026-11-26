import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { organizingGuideSchema, serializeGuideSchema } from '../../lib/organizing-guide-schema.mjs';

const guides = JSON.parse(readFileSync(new URL('../../data/guides.json', import.meta.url)));
const origin = 'https://savvy.jeezlabs.io';

test('all published guides describe their actual title, update date, steps and questions', () => {
  for (const guide of guides) {
    const { '@graph': graph } = organizingGuideSchema(guide, origin);
    const article = graph.find(node => node['@type'] === 'Article');
    assert.equal(article.headline, guide.title.replace(/｜Savvy$/, ''));
    assert.equal(article.dateModified, guide.updatedAt);
    assert.match(article.dateModified, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(article.datePublished, undefined);
    const breadcrumbs = graph.find(node => node['@type'] === 'BreadcrumbList').itemListElement;
    assert.deepEqual(breadcrumbs.map(item => item.position), [1, 2, 3]);
    assert.equal(breadcrumbs.at(-1).item, article.url);
    const steps = graph.find(node => node['@type'] === 'HowTo').step.flatMap(section => section.itemListElement);
    const expectedSteps = guide.sections.flatMap(section => section.blocks.flatMap(block => block.items || []));
    assert.deepEqual(steps.map(step => step.text), expectedSteps);
    assert.equal(new Set(steps.map(step => step.url)).size, steps.length);
    const expectedQuestions = guide.sections.flatMap(section => section.blocks.filter(block => block.type === 'question').map(block => block.text));
    const faq = graph.find(node => node['@type'] === 'FAQPage');
    assert.deepEqual(faq?.mainEntity.map(question => question.name) || [], expectedQuestions);
  }
});

test('no invented steps, answers, dates, timings or pricing for a prose-only guide', () => {
  const guide = { slug: 'prose', title: 'Only prose', description: 'A note', updatedAt: '2026-11-26', sections: [{ heading: 'Notes', blocks: [{ type: 'paragraph', text: 'Notes' }, { type: 'question', text: 'Unanswered?' }] }] };
  const graph = organizingGuideSchema(guide, origin)['@graph'];
  assert.deepEqual(graph.map(node => node['@type']), ['Article', 'BreadcrumbList']);
  for (const node of graph) for (const key of ['datePublished', 'totalTime', 'estimatedCost', 'offers']) assert.equal(node[key], undefined);
});

test('FAQ answers stop at block boundaries and remain inside the same section', () => {
  const guide = { ...guides[0], sections: [
    { heading: 'FAQ', blocks: [{ type: 'question', text: 'One?' }, { type: 'paragraph', text: 'First.' }, { type: 'paragraph', text: 'Second.' }, { type: 'question', text: 'Two?' }] },
    { heading: 'Other', blocks: [{ type: 'paragraph', text: 'Unrelated.' }] },
  ] };
  const faq = organizingGuideSchema(guide, origin)['@graph'].find(node => node['@type'] === 'FAQPage');
  assert.equal(faq.mainEntity.length, 1);
  assert.equal(faq.mainEntity[0].acceptedAnswer.text, 'First.\n\nSecond.');
});

test('JSON-LD serialization cannot terminate its script element', () => {
  const value = { text: '</script><script>alert(1)</script>' };
  const serialized = serializeGuideSchema(value);
  assert.ok(!serialized.includes('<'));
  assert.deepEqual(JSON.parse(serialized), value);
});
