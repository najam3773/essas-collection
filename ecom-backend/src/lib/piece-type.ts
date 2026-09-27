export const PIECE_TYPE_KEYS = ['1-piece', '2-piece', '3-piece', 'dupatta'] as const;
export type PieceTypeKey = (typeof PIECE_TYPE_KEYS)[number];
export type PieceTypeEnum = 'ONE_PIECE' | 'TWO_PIECE' | 'THREE_PIECE' | 'DUPATTA';

const KEY_TO_ENUM: Record<PieceTypeKey, PieceTypeEnum> = {
  '1-piece': 'ONE_PIECE',
  '2-piece': 'TWO_PIECE',
  '3-piece': 'THREE_PIECE',
  dupatta: 'DUPATTA',
};

const ENUM_TO_KEY: Record<PieceTypeEnum, PieceTypeKey> = {
  ONE_PIECE: '1-piece',
  TWO_PIECE: '2-piece',
  THREE_PIECE: '3-piece',
  DUPATTA: 'dupatta',
};

const ENUM_TO_LABEL: Record<PieceTypeEnum, string> = {
  ONE_PIECE: '1 Piece',
  TWO_PIECE: '2 Piece',
  THREE_PIECE: '3 Piece',
  DUPATTA: 'Dupatta',
};

export function isPieceTypeKey(value: string): value is PieceTypeKey {
  return (PIECE_TYPE_KEYS as readonly string[]).includes(value);
}

export function parsePieceTypeKey(value: unknown): PieceTypeKey | null {
  if (typeof value !== 'string') return null;
  const n = value.trim().toLowerCase().replace(/\s+/g, '-');
  if (n === '1' || n === 'one-piece' || n === '1-piece' || n === 'one_piece' || n === 'onepiece') return '1-piece';
  if (n === '2' || n === 'two-piece' || n === '2-piece' || n === 'two_piece' || n === 'twopiece') return '2-piece';
  if (n === '3' || n === 'three-piece' || n === '3-piece' || n === 'three_piece' || n === 'threepiece') return '3-piece';
  if (n === 'dupatta' || n === 'dupattas') return 'dupatta';
  return isPieceTypeKey(n) ? n : null;
}

export function pieceTypeToEnum(key: PieceTypeKey): PieceTypeEnum {
  return KEY_TO_ENUM[key];
}

export function pieceFilterEnum(tag: string | null | undefined): PieceTypeEnum | undefined {
  const key = parsePieceTypeKey(tag);
  return key ? pieceTypeToEnum(key) : undefined;
}

export function pieceTypeToKey(value: string | null | undefined): PieceTypeKey | '' {
  if (!value) return '';
  if (value in ENUM_TO_KEY) return ENUM_TO_KEY[value as PieceTypeEnum];
  return parsePieceTypeKey(value) || '';
}

export function pieceTypeLabel(value: string | null | undefined): string {
  const key = pieceTypeToKey(value);
  if (!key) return '';
  return ENUM_TO_LABEL[KEY_TO_ENUM[key]];
}

export function inferPieceTypeFromTags(tags: string[] | null | undefined): PieceTypeEnum {
  const t = (tags || []).map((x) => x.toLowerCase());
  if (t.includes('1-piece')) return 'ONE_PIECE';
  if (t.includes('2-piece')) return 'TWO_PIECE';
  if (t.includes('dupatta') || t.includes('dupattas')) return 'DUPATTA';
  return 'THREE_PIECE';
}

export function pieceTypeTags(key: PieceTypeKey): string[] {
  return key === 'dupatta' ? ['dupatta', 'dupattas'] : [key];
}
