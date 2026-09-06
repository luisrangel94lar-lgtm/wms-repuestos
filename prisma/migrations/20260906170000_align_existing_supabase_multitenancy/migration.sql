-- Align the existing Supabase multi-tenant tables with the Prisma schema.
-- These additions are idempotent so the migration is safe on new and legacy databases.
ALTER TABLE "empresas"
  ADD COLUMN IF NOT EXISTS "logo" TEXT,
  ADD COLUMN IF NOT EXISTS "plan" TEXT NOT NULL DEFAULT 'mensual',
  ADD COLUMN IF NOT EXISTS "activa" BOOLEAN NOT NULL DEFAULT true;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'empresas'
      AND column_name = 'activo'
  ) THEN
    UPDATE "empresas" SET "activa" = "activo";
  END IF;
END $$;

ALTER TABLE "almacenes"
  ADD COLUMN IF NOT EXISTS "encargado" TEXT;
