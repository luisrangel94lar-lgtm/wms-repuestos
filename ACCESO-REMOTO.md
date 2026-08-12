# ============================================================
#  WMS Repuestos HVAC - Guía de Acceso Remoto
#  Para acceder desde otra ciudad/red diferente
# ============================================================

Tienes 3 opciones para acceder a tu WMS desde otra ciudad:

## OPCIÓN 1: Cloudflare Tunnel ⭐ RECOMENDADA (Gratis)

La más segura, rápida y fácil. No necesitas abrir puertos ni configurar router.

### ¿Qué necesitas?
1. Una cuenta gratuita en https://dash.cloudflare.com
2. Un dominio propio (puede ser uno barato como .com.co ~$12/año)

### Pasos:
1. Regístrate en Cloudflare y agrega tu dominio
2. En tu PC, instala Cloudflare Tunnel:
   ```bash
   # Mac
   brew install cloudflared

   # Windows - descarga de:
   # https://github.com/cloudflare/cloudflared/releases

   # Linux
   curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
   chmod +x cloudflared
   sudo mv cloudflared /usr/local/bin/
   ```
3. Inicia tu WMS normalmente:
   ```bash
   cd wms-repuestos
   bun run dev
   ```
4. En otra terminal, ejecuta el túnel:
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```
5. Cloudflare te dará una URL como:
   ```
   https://tu-wms-xxxx.trycloudflare.com
   ```
   ¡Esa URL funciona desde CUALQUIER parte del mundo!

### Para hacerlo PERMANENTE:
```bash
# Autenticar con tu cuenta de Cloudflare
cloudflared tunnel login

# Crear un túnel
cloudflared tunnel create wms-repuestos

# Configurar el dominio (ej: wms.tudominio.com)
cloudflared tunnel route dns wms-repuestos wms.tudominio.com

# Crear archivo de configuración ~/.cloudflared/config.yml
cloudflared tunnel run wms-repuestos
```

Ejemplo de `~/.cloudflared/config.yml`:
```yaml
tunnel: <TU-TUNNEL-ID>
credentials-file: ~/.cloudflared/<TU-TUNNEL-ID>.json

ingress:
  - hostname: wms.tudominio.com
    service: http://localhost:3000
  - service: http_status:404
```

---

## OPCIÓN 2: ngrok (Rápido y Temporal)

Ideal para pruebas rápidas. Genera una URL pública al instante.

### Pasos:
1. Regístrate en https://ngrok.com (gratis con límites)
2. Instala ngrok:
   ```bash
   # Mac
   brew install ngrok

   # Windows - descarga de https://ngrok.com/download
   ```
3. Autentica:
   ```bash
   ngrok config add-authtoken TU_TOKEN
   ```
4. Inicia tu WMS:
   ```bash
   bun run dev
   ```
5. En otra terminal:
   ```bash
   ngrok http 3000
   ```
6. Te dará una URL como: `https://abcd-12-34-56-78.ngrok-free.app`

⚠️ Limitación: La URL cambia cada vez que reinicias (plan gratis).

---

## OPCIÓN 3: Servidor VPS (Producción Profesional)

La mejor opción para uso permanente y serio. Necesitas un servidor en la nube.

### Proveedores recomendados (baratos):
| Proveedor | Precio mensual | Soporte |
|-----------|---------------|---------|
| **Hetzner** (Alemania) | ~€4/mes | Excelente |
| **DigitalOcean** | ~$6/mes | Bueno |
| **Contabo** | ~$5/mes | Básico |

### Pasos con Hetzner (ejemplo):
1. Crea una cuenta en https://hetzner.com
2. Crea un servidor CX22 (~€4.27/mes)
3. Conéctate por SSH:
   ```bash
   ssh root@TU_IP_SERVIDOR
   ```
4. Instala dependencias:
   ```bash
   curl -fsSL https://bun.sh/install | bash
   git clone <tu-repositorio> /opt/wms-repuestos
   cd /opt/wms-repuestos
   bun install
   bun run db:push
   ```
5. Construye y ejecuta en modo producción:
   ```bash
   bun run build
   bun run start:lan
   ```

6. Configura Nginx como proxy:
   ```bash
   apt install nginx
   ```
   Crea `/etc/nginx/sites-available/wms`:
   ```nginx
   server {
       listen 80;
       server_name tudominio.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

7. Activa certificado SSL gratuito:
   ```bash
   apt install certbot python3-certbot-nginx
   certbot --nginx -d tudominio.com
   ```

8. Para que inicie automáticamente al reiniciar:
   ```bash
   # Crear servicio systemd
   cat > /etc/systemd/system/wms.service << EOF
   [Unit]
   Description=WMS Repuestos
   After=network.target

   [Service]
   Type=simple
   User=root
   WorkingDirectory=/opt/wms-repuestos
   Environment=NODE_ENV=production
   ExecStart=/root/.bun/bin/bun run start:lan
   Restart=always

   [Install]
   WantedBy=multi-user.target
   EOF

   systemctl enable wms
   systemctl start wms
   ```

---

## 📊 Comparación de Opciones

| | Cloudflare Tunnel | ngrok | VPS |
|--|-------------------|-------|-----|
| **Costo** | Gratis | Gratis (limitado) | ~$5-7/mes |
| **Dificultad** | ⭐ Fácil | ⭐ Muy fácil | ⭐⭐⭐ Media |
| **URL propia** | Sí (con dominio) | No | Sí |
| **SSL/HTTPS** | Automático | Automático | Manual + Let's Encrypt |
| **Permanente** | Sí | No (grtis) | Sí |
| **Rendimiento** | Bueno | Bueno | Excelente |
| **Base de datos** | Local SQLite ✅ | Local SQLite ✅ | Local SQLite ✅ |
| **Fiabilidad** | Alta | Media | Muy alta |

---

## 🎯 Mi recomendación para ti:

1. **Para empezar HOY**: Opción 2 (ngrok) - 5 minutos y listo
2. **Para uso diario**: Opción 1 (Cloudflare Tunnel) - gratis, seguro, con tu dominio
3. **Para uso profesional**: Opción 3 (VPS) - el más robusto, ~$5/mes

La **Opción 1 (Cloudflare Tunnel)** es el mejor balance entre facilidad, costo y profesionalismo.
