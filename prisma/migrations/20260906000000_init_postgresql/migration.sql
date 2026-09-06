-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "marcas" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "marcas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoriaPadre" INTEGER,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipos_compatibles" (
    "id" SERIAL NOT NULL,
    "idMarca" INTEGER NOT NULL,
    "modelo" TEXT NOT NULL,
    "tipoEquipo" TEXT,

    CONSTRAINT "equipos_compatibles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos" (
    "id" SERIAL NOT NULL,
    "sku" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "idCategoria" INTEGER,
    "idMarca" INTEGER,
    "codigoBarras" TEXT,
    "unidadMedida" TEXT NOT NULL DEFAULT 'unidad',
    "costoUnitario" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "precioVenta" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stockMinimo" INTEGER NOT NULL DEFAULT 0,
    "stockMaximo" INTEGER,
    "fotoUrl" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "producto_equipo" (
    "idProducto" INTEGER NOT NULL,
    "idEquipo" INTEGER NOT NULL,

    CONSTRAINT "producto_equipo_pkey" PRIMARY KEY ("idProducto","idEquipo")
);

-- CreateTable
CREATE TABLE "ubicaciones" (
    "id" SERIAL NOT NULL,
    "pasillo" TEXT NOT NULL,
    "estante" TEXT NOT NULL,
    "nivel" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "almacenId" INTEGER,

    CONSTRAINT "ubicaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock" (
    "idProducto" INTEGER NOT NULL,
    "idUbicacion" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "stock_pkey" PRIMARY KEY ("idProducto","idUbicacion")
);

-- CreateTable
CREATE TABLE "tipos_movimiento" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "tipos_movimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos" (
    "id" SERIAL NOT NULL,
    "idProducto" INTEGER NOT NULL,
    "idUbicacion" INTEGER,
    "idTipo" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "costoUnitario" DOUBLE PRECISION,
    "referencia" TEXT,
    "usuario" TEXT,
    "observacion" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "almacenId" INTEGER,

    CONSTRAINT "movimientos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "email" TEXT,
    "tipoCliente" TEXT NOT NULL DEFAULT 'Tecnico',
    "fechaRegistro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ventas" (
    "id" SERIAL NOT NULL,
    "idCliente" INTEGER NOT NULL,
    "folio" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subtotal" DOUBLE PRECISION,
    "total" DOUBLE PRECISION,
    "estado" TEXT NOT NULL DEFAULT 'COMPLETADA',
    "almacenId" INTEGER,

    CONSTRAINT "ventas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venta_detalle" (
    "idVenta" INTEGER NOT NULL,
    "idProducto" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnitario" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "venta_detalle_pkey" PRIMARY KEY ("idVenta","idProducto")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'tecnico',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "ultimoAcceso" TIMESTAMP(3),
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" INTEGER,
    "empresaId" INTEGER,
    "almacenId" INTEGER,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empresas" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "nit" TEXT,
    "direccion" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "logo" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "plan" TEXT NOT NULL DEFAULT 'mensual',
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "almacenes" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT,
    "telefono" TEXT,
    "encargado" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "empresaId" INTEGER NOT NULL,

    CONSTRAINT "almacenes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "licencias" (
    "id" SERIAL NOT NULL,
    "clave" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'trial',
    "estado" TEXT NOT NULL DEFAULT 'activa',
    "fechaActivacion" TIMESTAMP(3),
    "fechaVencimiento" TIMESTAMP(3),
    "maxUsuarios" INTEGER NOT NULL DEFAULT 3,
    "diasPrueba" INTEGER NOT NULL DEFAULT 30,
    "datosEmpresa" TEXT,
    "notas" TEXT,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "empresaId" INTEGER,

    CONSTRAINT "licencias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "marcas_nombre_key" ON "marcas"("nombre");

-- CreateIndex
CREATE INDEX "categorias_categoriaPadre_idx" ON "categorias"("categoriaPadre");

-- CreateIndex
CREATE UNIQUE INDEX "equipos_compatibles_idMarca_modelo_key" ON "equipos_compatibles"("idMarca", "modelo");

-- CreateIndex
CREATE UNIQUE INDEX "productos_sku_key" ON "productos"("sku");

-- CreateIndex
CREATE INDEX "idx_productos_stock_minimo" ON "productos"("stockMinimo");

-- CreateIndex
CREATE INDEX "productos_sku_idx" ON "productos"("sku");

-- CreateIndex
CREATE INDEX "productos_nombre_idx" ON "productos"("nombre");

-- CreateIndex
CREATE INDEX "ubicaciones_almacenId_idx" ON "ubicaciones"("almacenId");

-- CreateIndex
CREATE UNIQUE INDEX "ubicaciones_almacenId_pasillo_estante_nivel_key" ON "ubicaciones"("almacenId", "pasillo", "estante", "nivel");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_movimiento_nombre_key" ON "tipos_movimiento"("nombre");

-- CreateIndex
CREATE INDEX "idx_movimientos_fecha" ON "movimientos"("fecha");

-- CreateIndex
CREATE INDEX "idx_movimientos_producto" ON "movimientos"("idProducto");

-- CreateIndex
CREATE INDEX "movimientos_almacenId_fecha_idx" ON "movimientos"("almacenId", "fecha");

-- CreateIndex
CREATE INDEX "clientes_nombre_idx" ON "clientes"("nombre");

-- CreateIndex
CREATE INDEX "clientes_email_idx" ON "clientes"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ventas_folio_key" ON "ventas"("folio");

-- CreateIndex
CREATE INDEX "idx_ventas_fecha" ON "ventas"("fecha");

-- CreateIndex
CREATE INDEX "ventas_almacenId_fecha_idx" ON "ventas"("almacenId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_empresaId_idx" ON "usuarios"("empresaId");

-- CreateIndex
CREATE INDEX "usuarios_almacenId_idx" ON "usuarios"("almacenId");

-- CreateIndex
CREATE UNIQUE INDEX "empresas_nit_key" ON "empresas"("nit");

-- CreateIndex
CREATE UNIQUE INDEX "almacenes_empresaId_nombre_key" ON "almacenes"("empresaId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "licencias_clave_key" ON "licencias"("clave");

-- AddForeignKey
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_categoriaPadre_fkey" FOREIGN KEY ("categoriaPadre") REFERENCES "categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipos_compatibles" ADD CONSTRAINT "equipos_compatibles_idMarca_fkey" FOREIGN KEY ("idMarca") REFERENCES "marcas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_idCategoria_fkey" FOREIGN KEY ("idCategoria") REFERENCES "categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_idMarca_fkey" FOREIGN KEY ("idMarca") REFERENCES "marcas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto_equipo" ADD CONSTRAINT "producto_equipo_idProducto_fkey" FOREIGN KEY ("idProducto") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto_equipo" ADD CONSTRAINT "producto_equipo_idEquipo_fkey" FOREIGN KEY ("idEquipo") REFERENCES "equipos_compatibles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ubicaciones" ADD CONSTRAINT "ubicaciones_almacenId_fkey" FOREIGN KEY ("almacenId") REFERENCES "almacenes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock" ADD CONSTRAINT "stock_idProducto_fkey" FOREIGN KEY ("idProducto") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock" ADD CONSTRAINT "stock_idUbicacion_fkey" FOREIGN KEY ("idUbicacion") REFERENCES "ubicaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_almacenId_fkey" FOREIGN KEY ("almacenId") REFERENCES "almacenes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_idProducto_fkey" FOREIGN KEY ("idProducto") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_idUbicacion_fkey" FOREIGN KEY ("idUbicacion") REFERENCES "ubicaciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_idTipo_fkey" FOREIGN KEY ("idTipo") REFERENCES "tipos_movimiento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_almacenId_fkey" FOREIGN KEY ("almacenId") REFERENCES "almacenes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_idCliente_fkey" FOREIGN KEY ("idCliente") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta_detalle" ADD CONSTRAINT "venta_detalle_idVenta_fkey" FOREIGN KEY ("idVenta") REFERENCES "ventas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta_detalle" ADD CONSTRAINT "venta_detalle_idProducto_fkey" FOREIGN KEY ("idProducto") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_creadoPor_fkey" FOREIGN KEY ("creadoPor") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_almacenId_fkey" FOREIGN KEY ("almacenId") REFERENCES "almacenes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "almacenes" ADD CONSTRAINT "almacenes_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licencias" ADD CONSTRAINT "licencias_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
