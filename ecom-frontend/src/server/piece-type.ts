export const PIECE_TYPE_KEYS = ['1-piece', '2-piece', '3-piece', 'dupatta'] as const;
export type PieceTypeKey = (typeof PIECE_TYPE_KEYS)[number];
export type PieceTypeEnum = 'ONE_PIECE' | 'TWO_PIECE' | 'THREE_PIECE' | 'DUPATTA';

const KEY_TO_ENUM: Record<PieceTypeKey, PieceTypeEnum> = {
  '1-piece': 'ONE_PIECE',
  '2-piece': 'TWO_PIECE',
  '3-piece': 'THREE_PIECE',
  dupatta: 'DUPATTA',
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
