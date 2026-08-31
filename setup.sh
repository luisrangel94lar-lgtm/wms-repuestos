#!/bin/bash
# ============================================================
#  WMS Repuestos HVAC - Script de Instalación Automática
#  Para Mac y Linux
# ============================================================

set -e

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║     🏭 WMS Repuestos HVAC - Instalador Local            ║"
echo "║     Sistema de Gestión de Almacén                       ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# --- 1. Verificar Node.js ---
echo -n "🔍 Verificando Node.js... "
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✓ Instalado (${NODE_VERSION})${NC}"
else
    echo -e "${RED}✗ No encontrado${NC}"
    echo ""
    echo "⚠️  Node.js no está instalado. Descárgalo de:"
    echo "   https://nodejs.org (versión 18 LTS recomendada)"
    echo ""
    exit 1
fi

# --- 2. Verificar/Instalar Bun ---
echo -n "🔍 Verificando Bun... "
if command -v bun &> /dev/null; then
    BUN_VERSION=$(bun -v)
    echo -e "${GREEN}✓ Instalado (v${BUN_VERSION})${NC}"
else
    echo -e "${YELLOW}⚠ No encontrado, instalando...${NC}"
    npm install -g bun 2>/dev/null || {
        echo -e "${RED}✗ Error al instalar Bun${NC}"
        echo "   Intenta manualmente: npm install -g bun"
        exit 1
    }
    echo -e "${GREEN}✓ Bun instalado${NC}"
fi

# --- 3. Directorio del proyecto ---
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
echo -n "📁 Directorio del proyecto... "
echo -e "${GREEN}${PROJECT_DIR}${NC}"

cd "$PROJECT_DIR"

# --- 4. Instalar dependencias ---
echo ""
echo -n "📦 Instalando dependencias... "
if bun install; then
    echo -e "${GREEN}✓ Dependencias instaladas${NC}"
else
    echo -e "${RED}✗ Error instalando dependencias${NC}"
    echo "   Intenta: npm install"
    exit 1
fi

# --- 5. Generar cliente Prisma ---
echo ""
echo -n "🗄️  Generando cliente de base de datos (Prisma)... "
if bunx prisma generate 2>/dev/null || npx prisma generate; then
    echo -e "${GREEN}✓ Cliente generado${NC}"
else
    echo -e "${YELLOW}⚠ Podría generar un warning, continuando...${NC}"
fi

# --- 6. Configurar base de datos ---
echo ""
echo -n "🗄️  Sincronizando base de datos SQLite... "
if bun run db:push 2>/dev/null; then
    echo -e "${GREEN}✓ Base de datos lista${NC}"
else
    echo -e "${RED}✗ Error con la base de datos${NC}"
    exit 1
fi

# --- 7. Obtener IP local ---
echo ""
echo -n "🌐 Obteniendo IP local... "
if [[ "$OSTYPE" == "darwin"* ]]; then
    LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "127.0.0.1")
else
    LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "127.0.0.1")
fi
echo -e "${GREEN}${LOCAL_IP}${NC}"

# --- 8. Crear archivo .env si no existe ---
if [ ! -f .env ]; then
    cat > .env << EOF
# WMS Repuestos HVAC - Configuración Local
DATABASE_URL="file:./db/wms.db"
NEXT_PUBLIC_APP_URL="http://${LOCAL_IP}:3000"
EOF
    echo -e "📝 Archivo .env creado"
fi

# --- Resumen final ---
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                 ✅ ¡INSTALACIÓN COMPLETA!              ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "📱 Para ACCEDER DESDE TU CELULAR:"
echo "   1. Asegúrate de que PC y celular estén en la misma WiFi"
echo "   2. Inicia el servidor con:"
echo ""
echo -e "      ${GREEN}bun run dev:lan${NC}"
echo ""
echo "   3. Desde tu celular abre:"
echo ""
echo -e "      ${GREEN}http://${LOCAL_IP}:3000${NC}"
echo ""
echo "💻 Desde tu PC abre:"
echo -e "      ${GREEN}http://localhost:3000${NC}"
echo ""
echo "🛑 Para detener el servidor: presiona Ctrl + C"
echo ""
