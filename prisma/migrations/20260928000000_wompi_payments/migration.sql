ALTER TABLE "empresas"
  ADD COLUMN "wompiPublicKey" TEXT,
  ADD COLUMN "wompiPrivateKeyEnc" TEXT,
  ADD COLUMN "wompiIntegritySecretEnc" TEXT,
  ADD COLUMN "wompiEventsSecretEnc" TEXT,
  ADD COLUMN "wompiSandbox" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "pagos" (
  "id" SERIAL NOT NULL,
  "empresaId" INTEGER NOT NULL,
  "ventaId" INTEGER NOT NULL,
  "referencia" TEXT NOT NULL,
  "proveedor" TEXT NOT NULL DEFAULT 'WOMPI',
  "metodo" TEXT NOT NULL DEFAULT 'WOMPI',
  "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
  "montoCentavos" INTEGER NOT NULL,
  "moneda" TEXT NOT NULL DEFAULT 'COP',
  "transaccionId" TEXT,
  "checkoutUrl" TEXT,
  "estadoProveedor" TEXT,
  "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fechaActualizacion" TIMESTAMP(3) NOT NULL,
  "fechaAprobacion" TIMESTAMP(3),
  CONSTRAINT "pagos_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pagos_referencia_key" ON "pagos"("referencia");
CREATE UNIQUE INDEX "pagos_transaccionId_key" ON "pagos"("transaccionId");
CREATE INDEX "pagos_empresaId_estado_idx" ON "pagos"("empresaId", "estado");
CREATE INDEX "pagos_ventaId_idx" ON "pagos"("ventaId");

ALTER TABLE "pagos" ADD CONSTRAINT "pagos_ventaId_fkey"
  FOREIGN KEY ("ventaId") REFERENCES "ventas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_empresaId_fkey"
  FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
