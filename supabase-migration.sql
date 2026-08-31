-- 1. Tabla de Empresas
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

-- 4. Agregar columnas a usuarios
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'empresa_id') THEN
    ALTER TABLE usuarios ADD COLUMN empresa_id INTEGER REFERENCES empresas(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'almacen_id') THEN
    ALTER TABLE usuarios ADD COLUMN almacen_id INTEGER REFERENCES almacenes(id);
  END IF;
END $$;

-- 5. Agregar columnas a otras tablas
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ubicaciones' AND column_name = 'almacen_id') THEN
    ALTER TABLE ubicaciones ADD COLUMN almacen_id INTEGER REFERENCES almacenes(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'movimientos' AND column_name = 'almacen_id') THEN
    ALTER TABLE movimientos ADD COLUMN almacen_id INTEGER REFERENCES almacenes(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ventas' AND column_name = 'almacen_id') THEN
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
WHERE NOT EXISTS (SELECT 1 FROM almacenes WHERE nombre = 'Almacén Principal');

-- 8. Crear/Actualizar Super Admin
INSERT INTO usuarios (nombre, email, password, rol, activo, empresa_id, fecha_creacion)
SELECT 'Super Admin', 'superadmin@wms.com', 'temp', 'super_admin', TRUE, e.id, NOW()
FROM empresas WHERE nombre = 'Empresa Demo'
ON CONFLICT (email) DO UPDATE SET
  rol = 'super_admin', activo = TRUE, empresa_id = EXCLUDED.empresa_id;

-- 9. Crear licencia
INSERT INTO licencias (clave, tipo, estado, fecha_activacion, fecha_vencimiento, max_usuarios, dias_prueba, empresa_id)
SELECT gen_random_uuid()::text, 'anual', 'activa', NOW(), NOW() + INTERVAL '365 days', 50, 30, e.id
FROM empresas WHERE nombre = 'Empresa Demo'
WHERE NOT EXISTS (SELECT 1 FROM licencias);