-- ============================================
-- WMS Repuestos - SQL Migration para Supabase
-- ============================================
-- PASO 1: Ir a https://supabase.com/dashboard
-- PASO 2: Seleccionar tu proyecto
-- PASO 3: Ir a "SQL Editor" en el menú lateral
-- PASO 4: Pegar TODO este script y darle "Run"
-- ============================================

-- Verificar si la tabla usuarios existe antes de crear relaciones
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'usuarios') THEN
    RAISE EXCEPTION 'La tabla "usuarios" no existe. Asegúrate de que las tablas base del WMS ya estén creadas.';
  END IF;
END $$;

-- 1. Tabla de Empresas (multi-empresa)
CREATE TABLE IF NOT EXISTS empresas (
  id            SERIAL PRIMARY KEY,
  nombre        VARCHAR(255) NOT NULL,
  nit           VARCHAR(255) UNIQUE,
  direccion     TEXT,
  telefono      VARCHAR(50),
  email         VARCHAR(255),
  logo          TEXT,
  activa        BOOLEAN DEFAULT TRUE,
  plan          VARCHAR(50) DEFAULT 'mensual',
  fecha_creacion TIMESTAMP DEFAULT NOW()
);

-- 2. Tabla de Almacenes
CREATE TABLE IF NOT EXISTS almacenes (
  id            SERIAL PRIMARY KEY,
  nombre        VARCHAR(255) NOT NULL,
  direccion     TEXT,
  telefono      VARCHAR(50),
  encargado     VARCHAR(255),
  activo        BOOLEAN DEFAULT TRUE,
  empresa_id    INTEGER REFERENCES empresas(id),
  fecha_creacion TIMESTAMP DEFAULT NOW()
);

-- 3. Tabla de Licencias
CREATE TABLE IF NOT EXISTS licencias (
  id                SERIAL PRIMARY KEY,
  clave             VARCHAR(255) UNIQUE,
  tipo              VARCHAR(50) DEFAULT 'trial',
  estado            VARCHAR(50) DEFAULT 'activa',
  fecha_activacion  TIMESTAMP,
  fecha_vencimiento TIMESTAMP,
  max_usuarios      INTEGER DEFAULT 3,
  dias_prueba       INTEGER DEFAULT 30,
  datos_empresa     TEXT,
  notas             TEXT,
  fecha_creacion    TIMESTAMP DEFAULT NOW(),
  empresa_id        INTEGER REFERENCES empresas(id)
);

-- 4. Agregar columnas multi-empresa a la tabla usuarios (si no existen)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'usuarios' AND column_name = 'empresa_id') THEN
    ALTER TABLE usuarios ADD COLUMN empresa_id INTEGER REFERENCES empresas(id);
    RAISE NOTICE 'Columna empresa_id agregada a usuarios';
  ELSE
    RAISE NOTICE 'Columna empresa_id ya existe en usuarios';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'usuarios' AND column_name = 'almacen_id') THEN
    ALTER TABLE usuarios ADD COLUMN almacen_id INTEGER REFERENCES almacenes(id);
    RAISE NOTICE 'Columna almacen_id agregada a usuarios';
  ELSE
    RAISE NOTICE 'Columna almacen_id ya existe en usuarios';
  END IF;
END $$;

-- 5. Agregar columnas multi-empresa a otras tablas (si no existen)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'ubicaciones' AND column_name = 'almacen_id') THEN
    ALTER TABLE ubicaciones ADD COLUMN almacen_id INTEGER REFERENCES almacenes(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'movimientos' AND column_name = 'almacen_id') THEN
    ALTER TABLE movimientos ADD COLUMN almacen_id INTEGER REFERENCES almacenes(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'ventas' AND column_name = 'almacen_id') THEN
    ALTER TABLE ventas ADD COLUMN almacen_id INTEGER REFERENCES almacenes(id);
  END IF;
END $$;

-- 6. Insertar Empresa Demo
INSERT INTO empresas (nombre, nit, direccion, telefono, email, plan, activa)
VALUES ('Empresa Demo', '900.123.456-7', 'Dirección de prueba', '3001234567', 'demo@empresa.com', 'anual', TRUE)
ON CONFLICT DO NOTHING;

-- 7. Insertar Almacén Principal
INSERT INTO almacenes (nombre, direccion, telefono, encargado, activo, empresa_id)
SELECT 'Almacén Principal', 'Bodega 1', '3001234567', 'Super Admin', TRUE, e.id
FROM empresas WHERE nombre = 'Empresa Demo'
WHERE NOT EXISTS (
  SELECT 1 FROM almacenes WHERE nombre = 'Almacén Principal'
);

-- 8. Crear/Actualizar Super Admin
-- IMPORTANTE: El password se actualizará con el hash correcto al ejecutar el script create-super-admin.ts
INSERT INTO usuarios (nombre, email, password, rol, activo, empresa_id, fecha_creacion)
SELECT 'Super Admin', 'superadmin@wms.com', 
  'temp', 'super_admin', TRUE, e.id, NOW()
FROM empresas WHERE nombre = 'Empresa Demo'
ON CONFLICT (email) DO UPDATE SET
  rol = 'super_admin',
  activo = TRUE,
  empresa_id = EXCLUDED.empresa_id;

-- 9. Crear licencia trial por defecto
INSERT INTO licencias (clave, tipo, estado, fecha_activacion, fecha_vencimiento, max_usuarios, dias_prueba, empresa_id)
SELECT 
  gen_random_uuid()::text,
  'anual', 
  'activa', 
  NOW(), 
  NOW() + INTERVAL '365 days',
  50, 
  30,
  e.id
FROM empresas WHERE nombre = 'Empresa Demo'
WHERE NOT EXISTS (
  SELECT 1 FROM licencias
);

-- ============================================
-- DESPUÉS de ejecutar este SQL, haz lo siguiente:
-- 
-- 1. En tu .env, agrega:
--    NEXTAUTH_SECRET=tu-secreto-seguro-aqui
--    NEXTAUTH_URL=http://localhost:3001
--
-- 2. Ejecuta el script para generar el hash de contraseña:
--    bun run prisma/create-super-admin.ts
--
-- 3. Reinicia el servidor:
--    bun run dev
--
-- 4. Inicia sesión con:
--    Email: superadmin@wms.com
--    Password: SuperAdmin2024!
-- ============================================
