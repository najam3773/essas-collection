-- Canonical product piece type. Safe to re-run.
DO $$ BEGIN
  CREATE TYPE "PieceType" AS ENUM ('ONE_PIECE', 'TWO_PIECE', 'THREE_PIECE', 'DUPATTA');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE products ADD COLUMN IF NOT EXISTS piece_type "PieceType" NOT NULL DEFAULT 'THREE_PIECE';

CREATE INDEX IF NOT EXISTS products_tenant_id_piece_type_idx ON products (tenant_id, piece_type);

UPDATE products SET piece_type = 'THREE_PIECE' WHERE '3-piece' = ANY(tags);
UPDATE products SET piece_type = 'ONE_PIECE' WHERE '1-piece' = ANY(tags);
UPDATE products SET piece_type = 'TWO_PIECE' WHERE '2-piece' = ANY(tags);
UPDATE products SET piece_type = 'DUPATTA'
  WHERE ('dupatta' = ANY(tags) OR 'dupattas' = ANY(tags))
    AND NOT ('1-piece' = ANY(tags))
    AND NOT ('2-piece' = ANY(tags))
    AND NOT ('3-piece' = ANY(tags));
