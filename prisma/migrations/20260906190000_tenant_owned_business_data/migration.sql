-- Convierte los datos operativos en recursos pertenecientes a una empresa.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM empresas) THEN
    INSERT INTO empresas (nombre, activa, plan, "fechaCreacion")
    VALUES ('Empresa principal', true, 'mensual', NOW());
  END IF;
END $$;

ALTER TABLE productos ADD COLUMN IF NOT EXISTS "empresaId" INTEGER;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS "empresaId" INTEGER;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS "empresaId" INTEGER;
ALTER TABLE movimientos ADD COLUMN IF NOT EXISTS "empresaId" INTEGER;

UPDATE productos SET "empresaId" = (SELECT MIN(id) FROM empresas) WHERE "empresaId" IS NULL;
UPDATE clientes SET "empresaId" = (SELECT MIN(id) FROM empresas) WHERE "empresaId" IS NULL;
UPDATE ventas v SET "empresaId" = COALESCE(
  (SELECT a."empresaId" FROM almacenes a WHERE a.id = v."almacenId"),
  (SELECT MIN(id) FROM empresas)
) WHERE v."empresaId" IS NULL;
UPDATE movimientos m SET "empresaId" = COALESCE(
  (SELECT a."empresaId" FROM almacenes a WHERE a.id = m."almacenId"),
  (SELECT MIN(id) FROM empresas)
) WHERE m."empresaId" IS NULL;
UPDATE usuarios SET "empresaId" = (SELECT MIN(id) FROM empresas)
WHERE "empresaId" IS NULL AND rol <> 'super_admin';
UPDATE licencias SET "empresaId" = (SELECT MIN(id) FROM empresas)
WHERE "empresaId" IS NULL;

ALTER TABLE productos ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE clientes ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE ventas ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE movimientos ALTER COLUMN "empresaId" SET NOT NULL;

DROP INDEX IF EXISTS productos_sku_key;
DROP INDEX IF EXISTS ventas_folio_key;
CREATE UNIQUE INDEX IF NOT EXISTS "productos_empresaId_sku_key" ON productos("empresaId", sku);
CREATE UNIQUE INDEX IF NOT EXISTS "ventas_empresaId_folio_key" ON ventas("empresaId", folio);
CREATE INDEX IF NOT EXISTS "productos_empresaId_idx" ON productos("empresaId");
CREATE INDEX IF NOT EXISTS "clientes_empresaId_idx" ON clientes("empresaId");
CREATE INDEX IF NOT EXISTS "ventas_empresaId_idx" ON ventas("empresaId");
CREATE INDEX IF NOT EXISTS "movimientos_empresaId_idx" ON movimientos("empresaId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'productos_empresaId_fkey') THEN
    ALTER TABLE productos ADD CONSTRAINT "productos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES empresas(id) ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clientes_empresaId_fkey') THEN
    ALTER TABLE clientes ADD CONSTRAINT "clientes_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES empresas(id) ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ventas_empresaId_fkey') THEN
    ALTER TABLE ventas ADD CONSTRAINT "ventas_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES empresas(id) ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'movimientos_empresaId_fkey') THEN
    ALTER TABLE movimientos ADD CONSTRAINT "movimientos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES empresas(id) ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
