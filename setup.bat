@echo off
:: ============================================================
::  WMS Repuestos HVAC - Script de Instalacion Automatica
::  Para Windows
:: ============================================================

echo.
echo ============================================================
echo      WMS Repuestos HVAC - Instalador Local
echo      Sistema de Gestion de Almacen
echo ============================================================
echo.

:: --- 1. Verificar Node.js ---
echo Verificando Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado.
    echo Descargalo de: https://nodejs.org ^(version 18 LTS recomendada^)
    pause
    exit /b 1
)
node -v
echo [OK] Node.js encontrado
echo.

:: --- 2. Verificar/Instalar Bun ---
echo Verificando Bun...
where bun >nul 2>nul
if %errorlevel% neq 0 (
    echo [AVISO] Bun no encontrado, instalando...
    npm install -g bun
    if %errorlevel% neq 0 (
        echo [ERROR] No se pudo instalar Bun. Intenta manualmente: npm install -g bun
        pause
        exit /b 1
    )
    echo [OK] Bun instalado
) else (
    echo [OK] Bun encontrado
)
echo.

:: --- 3. Directorio del proyecto ---
cd /d "%~dp0"
echo [OK] Directorio: %CD%
echo.

:: --- 4. Instalar dependencias ---
echo Instalando dependencias...
call bun install
if %errorlevel% neq 0 (
    echo [ERROR] Error instalando dependencias. Intenta: npm install
    pause
    exit /b 1
)
echo [OK] Dependencias instaladas
echo.

:: --- 5. Generar cliente Prisma ---
echo Generando cliente de base de datos ^(Prisma^)...
call bunx prisma generate
echo [OK] Cliente generado
echo.

:: --- 6. Configurar base de datos ---
echo Sincronizando base de datos SQLite...
call bun run db:push
if %errorlevel% neq 0 (
    echo [ERROR] Error con la base de datos
    pause
    exit /b 1
)
echo [OK] Base de datos lista
echo.

:: --- 7. Obtener IP local ---
echo Obteniendo IP local...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /C:"IPv4" ^| findstr /C:"192.168"') do (
    set "LOCAL_IP=%%a"
)
set "LOCAL_IP=%LOCAL_IP: =%"
if "%LOCAL_IP%"=="" set "LOCAL_IP=192.168.1.100"
echo [OK] IP: %LOCAL_IP%
echo.

:: --- 8. Crear archivo .env si no existe ---
if not exist .env (
    echo DATABASE_URL="file:./db/wms.db" > .env
    echo NEXT_PUBLIC_APP_URL="http://%LOCAL_IP%:3000" >> .env
    echo [OK] Archivo .env creado
)
echo.

:: --- Resumen final ---
echo ============================================================
echo              INSTALACION COMPLETA!
echo ============================================================
echo.
echo Para ACCEDER DESDE TU CELULAR:
echo   1. Asegurate de que PC y celular esten en la misma WiFi
echo   2. Inicia el servidor con:
echo.
echo       bun run dev:lan
echo.
echo   3. Desde tu celular abre en el navegador:
echo.
echo       http://%LOCAL_IP%:3000
echo.
echo Desde tu PC abre: http://localhost:3000
echo.
echo Para detener el servidor: presiona Ctrl + C
echo.
pause
