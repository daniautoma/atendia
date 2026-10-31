# 🦷 Atendia — Asistente de IA Omnicanal para Negocios Locales

**Atendia** es una aplicación diseñada para que agencias y negocios locales (clínicas, despachos, academias, talleres) creen, configuren y pongan a trabajar un asistente de Inteligencia Artificial que atiende a los clientes por **WhatsApp** y por el **Chat de su web**.

Responde con la información de la empresa, gestiona citas en tiempo real en **Google Calendar**, envía confirmaciones por **Gmail**, anota clientes en **Google Sheets**, cobra señales con **Stripe**, avisa al equipo por **Slack** o webhooks, y cede el control a una persona cuando es necesario.

Toda la interfaz está en **español (`es-SV`)** con zona horaria **`America/El_Salvador` (GMT-6)** y moneda en **Dólares (USD)**. Todo se configura desde el propio panel, sin tocar código.

---

## ⚡ Inicio Rápido (Un Solo Comando)

En desarrollo local no necesitas instalar Docker ni un servidor PostgreSQL externo: el proyecto incluye un **PostgreSQL local embebido (`PGlite`)** que arranca automáticamente.

### 1. Clonar e Instalar
```bash
git clone <url-del-repositorio> atendia
cd atendia
npm install
```

### 2. Configurar Variables de Entorno
Copia el archivo de ejemplo:
```bash
cp .env.example .env
```
*(El archivo `.env.example` ya contiene valores funcionales por defecto para desarrollo local).*

### 3. Arrancar la Aplicación
```bash
npm run dev
```

Este comando levanta de forma coordinada:
1. **Base de Datos PostgreSQL local** (en `127.0.0.1:5432` con persistencia en `./data/pgdata`).
2. **Servidor Web Next.js** (en [http://localhost:3000](http://localhost:3000)).
3. **Worker de fondo en Node.js** (mantiene Baileys, colas de debounce de 8s y tareas programadas).

---

## 🔐 Acceso al Panel de Control

Una vez arrancado, entra en [http://localhost:3000](http://localhost:3000) e inicia sesión:

- **Correo**: `admin@atendia.local`
- **Contraseña**: `admin1234password`

*(El negocio inicial viene precargado con los datos de la **«Clínica Dental San Salvador»**: 8 servicios odontológicos en USD, 10 preguntas frecuentes y horarios de San Salvador).*

---

## 🏗️ Arquitectura de Canales e Integraciones

### 📱 WhatsApp: Arquitectura Modular Dual
- **Baileys QR**: Conexión directa vinculando el WhatsApp del móvil de la clínica mediante escaneo de código QR en pantalla. La sesión se guarda en `./whatsapp-session` y sobrevive a reinicios.
- **YCloud API Oficial**: Integración empresarial oficial de WhatsApp Business API mediante endpoints REST.
  - Endpoint de webhooks: `/api/webhooks/ycloud`
  - **Verificación criptográfica estricta**: cabecera `YCloud-Signature: t={timestamp},s={signature}` con HMAC-SHA256, tolerancia de 300s y `crypto.timingSafeEqual`.
  - **Idempotencia**: deduplicación automática de eventos repetidos.
  - Soporte de identificadores duales: número telefónico y BSUID oficial de Meta.

### 🌐 Chat Web Embeddable
- Widget interactivo flotante en tiempo real con selector de color corporativo.
- Página pública de demostración lista para probar: [http://localhost:3000/demo](http://localhost:3000/demo).
- Fragmento `<script>` listo para incrustar en WordPress, Shopify o webs a medida.

### 🔗 Las 6 Integraciones Reales
1. **Google Calendar**: Sincronización bidireccional de citas con Google OAuth incremental.
2. **Gmail**: Confirmaciones inmediatas de cita al cliente y resumen diario a las 20:00.
3. **Google Sheets**: Hoja automática «Contactos Atendia» en Drive sincronizando clientes y notas.
4. **Slack**: Alertas inmediatas en tu canal cuando un cliente necesita atención urgente.
5. **Stripe**: Generación de sesiones seguras de pago de señales para reservas.
6. **Webhooks Salientes**: Eventos en tiempo real firmados con HMAC-SHA256 para Make, n8n o tu CRM.

---

## 🐳 Despliegue en Producción con Docker y Traefik

El proyecto incluye un `Dockerfile` multietapa optimizado y un `docker-compose.yml` preparado para ejecutarse tras un proxy inverso Traefik con certificados SSL automáticos de Let's Encrypt:

```bash
docker compose up -d --build
```

---

## 🧪 Pruebas y Scripts

- `npm run dev`: Inicia base de datos, web y worker concurrentemente.
- `npm run build`: Validación estricta de compilación y empaquetado Next.js.
- `npm run prisma:generate`: Regenera los tipos del cliente Prisma.
- `npm run prisma:push`: Sincroniza cambios del esquema PostgreSQL.
- `npm run prisma:seed`: Recarga los datos iniciales de la «Clínica Dental Lumen».
