# WMS Repuestos

Sistema web para administrar repuestos, inventario, ubicaciones, movimientos, ventas, clientes, equipos compatibles, empresas, almacenes, usuarios y licencias.

**Copyright © 2026 Luis Angel Rangel Igirio. Todos los derechos reservados.**

Luis Angel Rangel Igirio es el creador y propietario exclusivo de WMS Repuestos. Este proyecto es software propietario y no concede licencias de uso, copia, modificación, distribución o comercialización salvo autorización expresa y escrita del propietario.

## Arquitectura de producción

- Next.js 16 + React 19
- Prisma 6 + PostgreSQL
- Supabase como PostgreSQL administrado
- Railway para el despliegue del contenedor
- PWA instalable con funcionamiento offline seguro
- Android mediante un paquete generado desde la PWA publicada

La aplicación usa un usuario PostgreSQL dedicado (`wms_app`) con `BYPASSRLS`. Las tablas públicas tienen RLS habilitado y no exponen políticas para los roles anónimos de Supabase. La autenticación y autorización de la aplicación se ejecutan en el servidor con NextAuth.

## Desarrollo local

Requisitos: Bun 1.3 o Node.js compatible y una base PostgreSQL.

```bash
bun install
copy .env.example .env
bunx prisma generate
bun run dev
```

Variables obligatorias:

```dotenv
DATABASE_URL="postgresql://usuario:password@host:5432/postgres?sslmode=require"
NEXTAUTH_SECRET="secreto-aleatorio-largo"
NEXTAUTH_URL="http://localhost:3000"
```

## Verificación

```bash
bun run check
```

Este comando ejecuta TypeScript, ESLint y el build de producción.

## Base de datos

El esquema canónico está en `prisma/schema.prisma`. Para una instalación nueva se puede aplicar la migración inicial con:

```bash
bun run db:deploy
```

La base de producción existente fue importada y validada antes del despliegue. Por seguridad, el contenedor no ejecuta migraciones automáticamente al iniciar.

El script `prisma/migrate-data.ts` sirve únicamente para una migración controlada desde la base SQLite histórica hacia PostgreSQL. No debe ejecutarse sobre una base que ya tenga datos.

## Despliegue en Railway

Railway usa `Dockerfile` y comprueba `/api/health`. Configure `DATABASE_URL`, `NEXTAUTH_SECRET` y `NEXTAUTH_URL` como variables privadas del servicio. La URL de PostgreSQL debe usar SSL.

## PWA

El manifiesto está en `public/manifest.json` y el service worker en `public/sw.js`. Las rutas API nunca se almacenan en caché; si no hay conexión, las navegaciones muestran `/offline`.

En navegadores compatibles, use **Instalar aplicación** o **Agregar a pantalla de inicio**. El APK se genera desde la URL HTTPS publicada para que Android valide el alcance y el service worker.

## Seguridad

- Contraseñas nuevas con bcrypt y actualización automática de hashes heredados al iniciar sesión.
- APIs WMS protegidas por sesión.
- Operaciones administrativas restringidas por rol.
- Activación de licencias limitada a claves emitidas previamente.
- Sin credenciales predeterminadas ni secretos en el repositorio.
- Cabeceras HTTP de seguridad y modo estricto de React habilitados.
