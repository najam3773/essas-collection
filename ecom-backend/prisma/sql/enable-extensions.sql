-- Non-destructive. Required for Prisma @db.Citext and gen_random_uuid().
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
