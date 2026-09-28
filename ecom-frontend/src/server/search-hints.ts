import { FABRIC_FILTERS } from '@/lib/unstitched';

export function searchTagHints(q: string) {
  const n = q.toLowerCase().trim();
  const tags: string[] = [];
  if (/\b3[\s-]?piece\b/.test(n)) tags.push('3-piece');
  if (/\b2[\s-]?piece\b/.test(n)) tags.push('2-piece');
  if (/\b1[\s-]?piece\b/.test(n)) tags.push('1-piece');
  if (/\bdupatta/.test(n)) tags.push('dupatta', 'dupattas');
  for (const fabric of FABRIC_FILTERS) {
    if (n.includes(fabric.slug)) tags.push(fabric.slug);
  }
  if (n.includes('embroider')) tags.push('embroidered');
  if (n.includes('print')) tags.push('printed');
  if (n.includes('unstitched')) tags.push('unstitched');
  const colorish = n.replace(/[^a-z0-9\s-]/g, '').trim();
  if (colorish) tags.push(colorish.replace(/\s+/g, '-'));
  return [...new Set(tags)];
}
