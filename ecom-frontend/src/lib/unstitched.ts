export const FABRIC_FILTERS = [
  { slug: 'lawn', name: 'Lawn', blurb: 'Light cloth for spring and summer.' },
  { slug: 'khaddar', name: 'Khaddar', blurb: 'Warm, textured winter fabric.' },
  { slug: 'linen', name: 'Linen', blurb: 'Premium autumn and winter drape.' },
  { slug: 'viscose', name: 'Viscose', blurb: 'Soft, flowing everyday wear.' },
  { slug: 'cotton', name: 'Cotton', blurb: 'Comfortable daily fabric.' },
  { slug: 'chiffon', name: 'Chiffon', blurb: 'Airy dupattas and dressier looks.' },
  { slug: 'silk', name: 'Silk', blurb: 'Lustrous occasion pieces.' },
  { slug: 'organza', name: 'Organza', blurb: 'Formal dupattas and evenings.' },
] as const;

export const PIECE_FILTERS = [
  { slug: '1-piece', name: '1 Piece', included: ['Shirt'] },
  { slug: '2-piece', name: '2 Piece', included: ['Shirt', 'Trouser'] },
  { slug: '3-piece', name: '3 Piece', included: ['Shirt', 'Trouser', 'Dupatta'] },
  { slug: 'dupatta', name: 'Dupatta', included: ['Dupatta'] },
] as const;

export const COLOR_FILTERS = [
  'ivory',
  'cream',
  'beige',
  'sand',
  'sage-green',
  'dusty-rose',
  'peach',
  'pink',
  'rose',
  'magenta',
  'deep-maroon',
  'crimson',
  'navy',
  'aqua',
  'teal',
  'ice-blue',
  'purple',
  'lilac',
  'plum',
  'mustard',
  'black',
  'charcoal',
];

export const HERO_IMAGES = {
  featured: { src: '/uploads/essa/img-08.jpg', alt: 'Roshni maroon linen three-piece' },
  supportA: { src: '/uploads/essa/img-02.jpg', alt: 'Gulnaar magenta linen' },
  supportB: { src: '/uploads/essa/img-05.jpg', alt: 'Aabroo navy linen three-piece' },
};

export const FABRIC_CARD_IMAGES: Record<string, string> = {
  lawn: '/uploads/essa/img-06.jpg',
  khaddar: '/uploads/essa/img-32.jpg',
  linen: '/uploads/essa/img-08.jpg',
  viscose: '/uploads/essa/img-09.jpg',
  cotton: '/uploads/essa/img-65.jpg',
  chiffon: '/uploads/essa/img-17.jpg',
};

export const PIECE_CARD_IMAGES: Record<string, string> = {
  '1-piece': '/uploads/essa/img-07.jpg',
  '2-piece': '/uploads/essa/img-47.jpg',
  '3-piece': '/uploads/essa/img-01.jpg',
  dupatta: '/uploads/essa/img-17.jpg',
};

export function pieceLabelFromEnum(pieceType?: string | null) {
  const v = (pieceType || '').toUpperCase();
  if (v === 'ONE_PIECE' || v === '1-PIECE') return '1 Piece';
  if (v === 'TWO_PIECE' || v === '2-PIECE') return '2 Piece';
  if (v === 'THREE_PIECE' || v === '3-PIECE') return '3 Piece';
  if (v === 'DUPATTA') return 'Dupatta';
  return '';
}

export function pieceLabelFromTags(tags?: string[] | null) {
  const t = (tags || []).map((x) => x.toLowerCase());
  if (t.includes('3-piece')) return '3 Piece';
  if (t.includes('2-piece')) return '2 Piece';
  if (t.includes('1-piece')) return '1 Piece';
  if (t.includes('dupatta') || t.includes('dupattas')) return 'Dupatta';
  return '';
}

export function pieceLabelFromProduct(product?: { pieceType?: string | null; tags?: string[] | null } | null) {
  return pieceLabelFromEnum(product?.pieceType) || pieceLabelFromTags(product?.tags);
}

export function pieceKeyFromTags(tags?: string[] | null) {
  const label = pieceLabelFromTags(tags);
  if (label === '3 Piece') return '3-piece';
  if (label === '2 Piece') return '2-piece';
  if (label === '1 Piece') return '1-piece';
  if (label === 'Dupatta') return 'dupatta';
  return '';
}

export function includedPieces(labelOrKey?: string | null) {
  const v = (labelOrKey || '').toLowerCase();
  if (v.includes('3')) return ['Shirt', 'Trouser', 'Dupatta'];
  if (v.includes('2')) return ['Shirt', 'Trouser'];
  if (v.includes('dupatta')) return ['Dupatta'];
  if (v.includes('1')) return ['Shirt'];
  return [];
}

export function fabricFromProduct(product: {
  category?: { name?: string | null; slug?: string | null } | null;
  tags?: string[] | null;
  variants?: Array<{ attributeValues?: Record<string, string> } | object>;
}) {
  const fromAttr = (product.variants?.[0] as { attributeValues?: Record<string, string> } | undefined)?.attributeValues
    ?.fabric;
  if (fromAttr) return fromAttr;
  if (product.category?.name) return product.category.name;
  const hit = FABRIC_FILTERS.find((f) => (product.tags || []).includes(f.slug));
  return hit?.name || '';
}
