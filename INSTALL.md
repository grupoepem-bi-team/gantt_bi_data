# BI GANTT — Documentación Técnica

## Tabla de Contenidos

1. [Descripción General](#1-descripción-general)
2. [Arquitectura](#2-arquitectura)
3. [Requisitos](#3-requisitos)
4. [Instalación y Puesta en Marcha](#4-instalación-y-puesta-en-marcha)
5. [Variables de Entorno](#5-variables-de-entorno)
6. [Estructura del Proyecto](#6-estructura-del-proyecto)
7. [Base de Datos](#7-base-de-datos)
8. [API REST — Endpoints](#8-api-rest--endpoints)
9. [Autenticación y Seguridad](#9-autenticación-y-seguridad)
10. [Frontend](#10-frontend)
11. [Despliegue](#11-despliegue)
12. [Tests](#12-tests)
13. [Mantenimiento](#13-mantenimiento)
14. [Resolución de Problemas](#14-resolución-de-problemas)

---

## 1. Descripción General

BI GANTT es una aplicación web de diagramas de Gantt para gestión de proyectos, construida con **Vue 3** (frontend) y **Express.js** (backend API), con **PostgreSQL** como base de datos. Incluye autenticación JWT, roles de usuario (Admin/Usuario), exportación a Excel, vista calendario, y modo oscuro/claro.

### Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Frontend | Vue 3 + Vite 6 | ES Modules |
| State | Pinia | 2.x |
| Backend | Express.js | 4.x |
| Base de datos | PostgreSQL | 16 (Alpine) |
| Runtime | Node.js | 22 (Alpine) |
| Contenedores | Docker + Docker Compose | v2 |
| Deploy estático | Vercel | — |
| Exportación | ExcelJS | 4.x |
| Auth | JWT (jsonwebtoken) | 30min access / 7d refresh |

---

## 2. Arquitectura

```
                    ┌─────────────────────────────────────┐
                    │         Navegador (SPA)             │
                    │    Vue 3 + Pinia + Vite             │
                    └──────────────┬──────────────────────┘
                                   │ HTTP/REST
                    ┌──────────────▼──────────────────────┐
                    │      Nginx (reverse proxy)         │
                    │      :8080 → /api/ = proxy pass   │
                    │             /   = static files     │
                    └──────────────┬──────────────────────┘
                                   │
                    ┌──────────────▼──────────────────────┐
                    │      Express.js API (:3000)         │
                    │  Helmet, CORS, Rate Limit, JWT      │
                    └──────────────┬──────────────────────┘
                                   │ pg (TCP)
                    ┌──────────────▼──────────────────────┐
                    │      PostgreSQL 16 (:5432)          │
                    │      gantt_db                       │
                    └─────────────────────────────────────┘
```

### Flujo de Autenticación

1. `POST /api/users/login` → JWT access token (30min) + refresh token (7d)
2. Access token en header `Authorization: Bearer <token>`
3. Refresh token en `POST /api/users/refresh` → nuevo access token
4. Tokens invalidados se almacenan en tabla `token_blacklist`
5. Cambio de contraseña o eliminación de usuario → blacklist del token

### Docker Compose (3 servicios)

```yaml
services:
  db:     # PostgreSQL 16 Alpine, healthcheck, volumen persistente
  api:    # Node 22 Alpine, depende de db (healthy), healthcheck /api/health
  app:    # Nginx Alpine, depende de api, sirve frontend + proxy /api/
```

---

## 3. Requisitos

| Requisito | Mínimo | Recomendado |
|-----------|--------|-------------|
| Docker | 20.10+ | 24+ |
| Docker Compose | 2.0+ | 2.20+ |
| RAM | 2 GB | 4 GB |
| Disco | 1 GB | 5 GB |
| Node.js (desarrollo local) | 20+ | 22 |
| npm | 9+ | 10+ |

---

## 4. Instalación y Puesta en Marcha

### 4.1 Clonar el repositorio

```bash
git clone https://github.com/grupoepem-bi-team/gantt_bi_data.git
cd gantt_bi_data
```

### 4.2 Configurar variables de entorno

```bash
cp .env.docker.example .env.docker
```

Editar `.env.docker` con valores seguros:

```env
POSTGRES_USER=gantt_user
POSTGRES_PASSWORD=<genera-un-password-seguro>     # CAMBIAR
POSTGRES_DB=gantt_db
POSTGRES_PORT=5432
API_PORT=3000

DATABASE_URL=postgresql://gantt_user:<password>@db:5432/gantt_db  # CAMBIAR
NODE_ENV=production
JWT_SECRET=<genera-un-secret-aleatorio-64-chars>                  # CAMBIAR
CORS_ORIGIN=http://localhost:8080
ADMIN_INITIAL_PASSWORD=<password-seguro>                          # CAMBIAR
JEAN_INITIAL_PASSWORD=<password-seguro>                           # CAMBIAR
JESUS_INITIAL_PASSWORD=<password-seguro>                           # CAMBIAR
APP_PORT=8080
```

> **Importante**: Nunca commits el archivo `.env.docker`. Ya está en `.gitignore`.

### 4.3 Iniciar con Docker Compose

```bash
docker compose --env-file .env.docker up -d --build
```

Esto:
1. Construye la imagen frontend (Vite build → Nginx)
2. Construye la imagen API (TypeScript compile → Node)
3. Levanta PostgreSQL con el schema y datos iniciales
4. Inicia todos los servicios conectados

### 4.4 Verificar

```bash
# Health check de la API
curl http://localhost:3000/api/health

# Acceder a la aplicación
# Navegador: http://localhost:8080
```

### 4.5 Primer inicio de sesión

| Usuario | Password | Rol |
|---------|----------|-----|
| `emmanuel.villasanti` | valor de `ADMIN_INITIAL_PASSWORD` | Admin |
| `jean` | valor de `JEAN_INITIAL_PASSWORD` | Usuario |
| `jesus` | valor de `JESUS_INITIAL_PASSWORD` | Usuario |

> Todos los usuarios iniciales tienen `debe_cambiar_password=TRUE`. El sistema fuerza el cambio de contraseña en el primer inicio de sesión.

### 4.6 Desarrollo local (sin Docker)

```bash
# Terminal 1: Base de datos + API
cd api
npm install
npm run dev        # tsx watch en :3000

# Terminal 2: Frontend
npm install
npm run dev        # Vite dev server en :5173 con proxy a :3000/api
```

Configurar `.env` en la raíz del proyecto `api/` con `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`.

---

## 5. Variables de Entorno

### Backend (API)

| Variable | Requerida | Default | Descripción |
|----------|-----------|---------|-------------|
| `DATABASE_URL` | Sí | — | String de conexión PostgreSQL |
| `JWT_SECRET` | Sí | `dev-only-fallback-change-in-production` | Secret para firmar tokens JWT (cambiar en producción) |
| `CORS_ORIGIN` | En producción | — | Origen permitido para CORS (ej: `http://localhost:8080`) |
| `NODE_ENV` | No | `development` | `production` habilita checks estrictos |
| `PORT` | No | `3000` | Puerto del servidor API |
| `ADMIN_INITIAL_PASSWORD` | No | `Epem1234` | Password inicial del admin |
| `JEAN_INITIAL_PASSWORD` | No | — | Password del usuario jean |
| `JESUS_INITIAL_PASSWORD` | No | — | Password del usuario jesus |

### Frontend (Vite)

| Variable | Requerida | Default | Descripción |
|----------|-----------|---------|-------------|
| `VITE_API_URL` | No | `/api` | URL base de la API. Solo la usa `GanttChart.vue`. `authStore.ts` usa `/api` hardcodeado |
| `VITE_APP_TITLE` | No | `Vue Gantt Chart` | Título de la aplicación |
| `VITE_APP_VERSION` | No | `1.0.0` | Versión mostrada en UI |

> **Nota**: `authStore.ts` usa `const API_URL = '/api'` hardcodeado. Solo `GanttChart.vue` lee `VITE_API_URL`. En Docker, nginx proxya `/api/` → `api:3000/api/`, así que el fallback `/api` funciona sin configuración adicional.

### Docker Compose

| Variable | Default | Descripción |
|----------|---------|-------------|
| `POSTGRES_USER` | `gantt_user` | Usuario PostgreSQL |
| `POSTGRES_PASSWORD` | — | Password PostgreSQL (requerido) |
| `POSTGRES_DB` | `gantt_db` | Nombre de la base de datos |
| `POSTGRES_PORT` | `5432` | Puerto expuesto de PostgreSQL |
| `API_PORT` | `3000` | Puerto expuesto de la API |
| `APP_PORT` | `8080` | Puerto expuesto del frontend |

---

## 6. Estructura del Proyecto

```
vue-gantt/
├── api/                          # Backend Express.js
│   ├── Dockerfile                # Node 22 Alpine, non-root user
│   ├── package.json              # Dependencias: express, pg, jsonwebtoken, bcryptjs...
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts              # App Express, middleware, rutas montadas
│       ├── db/
│       │   ├── connection.ts     # pg.Pool con DATABASE_URL
│       │   └── init.ts           # Schema creation, seed, migraciones
│       ├── middleware/
│       │   ├── auth.ts           # JWT auth, blacklist, requireAdmin, generateToken
│       │   └── validators.ts     # UUID y email validation middleware
│       └── routes/
│           ├── users.ts          # Auth, CRUD usuarios, reset password
│           ├── rows.ts           # CRUD categorías/filas (admin)
│           ├── items.ts          # CRUD tareas + bulk ops + export CSV
│           ├── logs.ts           # Activity logs (admin read, auth create)
│           ├── attachments.ts   # Adjuntos de tareas
│           ├── comments.ts      # Comentarios en tareas
│           ├── dependencies.ts  # Dependencias entre tareas
│           ├── history.ts        # Historial de cambios
│           ├── notifications.ts  # Notificaciones
│           ├── projects.ts      # Proyectos
│           ├── sessions.ts      # Sesiones de usuario
│           ├── stats.ts         # Estadísticas del dashboard
│           └── tags.ts          # Tags/etiquetas
├── database/
│   ├── schema.sql               # Schema completo con índices
│   └── init.sql                 # Schema básico + seed data
├── src/                          # Frontend Vue 3
│   ├── App.vue                  # Root: auth flow, data loading, calendario
│   ├── main.ts                  # Punto de entrada Vue + Pinia
│   ├── assets/
│   │   ├── Logo_Grupo_Epem.png
│   │   └── themes.css           # CSS variables dark/light
│   ├── components/
│   │   ├── AdminPanel.vue       # Panel admin overlay
│   │   ├── AdminSidebar.vue     # Sidebar admin (users + logs + reset pw)
│   │   ├── CalendarModal.vue    # Modal crear tarea desde calendario
│   │   ├── CalendarView.vue     # Vista calendario (mes/semana/día)
│   │   ├── ChangePasswordModal.vue  # Modal forzado cambio de password
│   │   ├── GanttChart.vue       # Gantt principal (toolbar, zoom, export)
│   │   ├── GanttList.vue       # Sidebar izquierdo (categorías)
│   │   ├── GanttTimeline.vue   # Timeline con drag/resize/context menu
│   │   ├── ItemModal.vue        # Modal crear/editar tarea (3 paneles)
│   │   ├── LoginForm.vue        # Formulario de login
│   │   └── UserSelector.vue     # Selector de usuario (admin)
│   ├── composables/
│   │   ├── useDragDrop.ts       # Estado drag & drop
│   │   ├── useExcelExport.ts    # Exportación Excel (ExcelJS async)
│   │   ├── useKeyboardShortcuts.ts  # Atajos de teclado
│   │   ├── useSkeletonLoader.ts     # Loaders tipo skeleton
│   │   ├── useTheme.ts              # Toggle dark/light (localStorage)
│   │   └── useTooltip.ts            # Posicionamiento de tooltips
│   ├── stores/
│   │   └── authStore.ts         # Pinia store: auth, users, logs, CRUD
│   ├── types/
│   │   └── gantt.ts             # Interfaces TypeScript
│   └── utils/
│       └── date.ts              # Utilidades dayjs para fechas
├── e2e/                          # Tests end-to-end
│   ├── test-integrity.cjs       # 64 tests de integridad
│   ├── test-security-regression.cjs  # 38 tests de seguridad
│   └── test-*.cjs               # Tests adicionales
├── docker-compose.yml            # 3 servicios: db, api, app
├── Dockerfile                    # Frontend: build + nginx (non-root)
├── nginx.conf                    # Security headers + API proxy + SPA
├── docker/nginx.conf             # Alternativa con gzip + cache
├── vite.config.ts                # Proxy /api → localhost:3000
├── vercel.json                   # Deploy estático (sin API)
├── .env.docker.example           # Template para Docker
└── .env.production.example       # Template para producción
```

---

## 7. Base de Datos

### 7.1 Tablas principales

#### Tablas creadas por `initDB()` (inicio de la API)

Estas tablas se crean automáticamente cuando la API arranca (`api/src/db/init.ts`):

| Tabla | Descripción | PK |
|-------|-------------|-----|
| `users` | Usuarios del sistema (Admin/Usuario) | UUID |
| `gantt_rows` | Categorías/filas del Gantt | UUID |
| `gantt_items` | Tareas del Gantt | UUID |
| `gantt_dependencies` | Dependencias entre tareas | UUID |
| `gantt_item_assignments` | Asignaciones usuario-tarea | UUID |
| `activity_logs` | Registro de actividad | UUID |
| `token_blacklist` | Tokens JWT revocados | UUID |

#### Tablas en `database/schema.sql` (para inicialización manual de DB)

El archivo `database/schema.sql` contiene tablas adicionales que no son creadas por `initDB()`. Se usa como script de inicialización en Docker (`docker-entrypoint-initdb.d`). Si la API arranca después, `initDB()` creará las tablas que falten (solo las 7 de arriba).

| Tabla | Descripción | PK |
|-------|-------------|-----|
| `sessions` | Sesiones activas de usuario | UUID |
| `projects` | Proyectos | UUID |
| `tags` | Etiquetas | UUID |
| `item_tags` | Relación items-tags | compuesto |
| `comments` | Comentarios en tareas | UUID |
| `attachments` | Adjuntos de tareas | UUID |
| `notifications` | Notificaciones de usuario | UUID |
| `gantt_items_history` | Historial de cambios (JSONB) | UUID |

> **Nota**: Las tablas adicionales existen en `schema.sql` y tienen rutas definidas en `api/src/routes/`, pero **no están montadas** en `api/src/index.ts`. Para usarlas hay que habilitar las rutas (ver sección 8.5).

### 7.2 Constraints

- `gantt_items.chk_time_range`: `time_end > time_start`
- `users.email`: UNIQUE
- `gantt_dependencies`: UNIQUE(from_item_id, to_item_id)
- `gantt_item_assignments`: UNIQUE(item_id, user_id)
- `tags.nombre`: UNIQUE
- `gantt_items.label`: CHECK(length(trim(label)) > 0) (solo en schema.sql)

### Diferencia entre init.ts y schema.sql

`gantt_rows` en `schema.sql` tiene columna `project_id UUID REFERENCES projects(id)`, pero `initDB()` no la crea. Si necesitas soporte de proyectos, ejecuta `schema.sql` manualmente o agrega la columna después.

### 7.3 Índices

Creados por `initDB()`:

```sql
CREATE INDEX idx_token_blacklist_jti ON token_blacklist(token_jti);
CREATE INDEX idx_token_blacklist_user ON token_blacklist(user_id);
CREATE INDEX idx_items_row_id ON gantt_items(row_id);
CREATE INDEX idx_items_assigned_user ON gantt_items(assigned_user_id);
CREATE INDEX idx_items_time_start ON gantt_items(time_start);
CREATE INDEX idx_items_created_by ON gantt_items(created_by);
CREATE INDEX idx_activity_logs_usuario ON activity_logs(usuario_id);
CREATE INDEX idx_activity_logs_fecha ON activity_logs(fecha);
CREATE INDEX idx_item_assignments_item ON gantt_item_assignments(item_id);
CREATE INDEX idx_item_assignments_user ON gantt_item_assignments(user_id);
```

Adicionales en `database/schema.sql`:

```sql
CREATE INDEX idx_items_row_assigned ON gantt_items(row_id, assigned_user_id);
CREATE INDEX idx_items_progress ON gantt_items(progress) WHERE progress > 0 AND progress < 100;
CREATE INDEX idx_items_date_range ON gantt_items(time_start, time_end);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_leida ON notifications(leida);
CREATE INDEX idx_notifications_user_leida ON notifications(user_id, leida) WHERE leida = FALSE;
CREATE INDEX idx_comments_item_id ON comments(item_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_item_fecha ON comments(item_id, fecha_creacion DESC);
CREATE INDEX idx_attachments_item_id ON attachments(item_id);
CREATE INDEX idx_attachments_user_id ON attachments(user_id);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_gantt_items_history_item_id ON gantt_items_history(item_id);
CREATE INDEX idx_gantt_items_history_fecha ON gantt_items_history(fecha);
```

### 7.4 Inicialización

La función `initDB()` en `api/src/db/init.ts`:
1. Crea todas las tablas si no existen
2. Crea índices si no existen
3. Inserta usuarios seed con passwords hasheados (bcrypt)
4. Inserta filas (categorías) por defecto
5. Inserta tareas de ejemplo con asignaciones
6. Migra datos antiguos (null → assignments table)
7. Limpia tokens blacklist de más de 8 días

---

## 8. API REST — Endpoints

### 8.1 Autenticación (`/api/users`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `POST` | `/api/users/login` | Rate limit 10/15min | Login, devuelve JWT access + refresh |
| `POST` | `/api/users/refresh` | Bearer (refresh) | Renueva access token |
| `POST` | `/api/users/change-password` | Bearer | Cambia contraseña (validar actual) |
| `PUT` | `/api/users/:id/reset-password` | Admin | Resetea contraseña, fuerza cambio |
| `GET` | `/api/users` | Bearer | Lista usuarios (paginada, searchable) |
| `GET` | `/api/users/:id` | Bearer | Obtiene usuario por ID |
| `POST` | `/api/users` | Admin | Crea usuario |
| `PUT` | `/api/users/:id` | Admin | Actualiza usuario |
| `DELETE` | `/api/users/:id` | Admin | Elimina usuario (no a sí mismo) |

### 8.2 Categorías (`/api/rows`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/rows` | Bearer | Lista todas las categorías |
| `POST` | `/api/rows` | Admin | Crea categoría |
| `PUT` | `/api/rows/:id` | Admin | Actualiza categoría |
| `DELETE` | `/api/rows/:id` | Admin | Elimina categoría (solo si está vacía) |
| `GET` | `/api/rows/:id/items-count` | Bearer | Cuenta items en categoría |

### 8.3 Tareas (`/api/items`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/items` | Bearer | Lista tareas (filtros: row_id, assigned_user_id, progress, fechas, search) |
| `POST` | `/api/items` | Bearer | Crea tarea |
| `PUT` | `/api/items/:id` | Bearer (owner o admin) | Actualiza tarea |
| `DELETE` | `/api/items/:id` | Bearer (owner o admin) | Elimina tarea |
| `POST` | `/api/items/bulk` | Admin | Crear hasta 100 tareas |
| `PUT` | `/api/items/bulk` | Admin | Actualizar hasta 100 tareas |
| `GET` | `/api/items/export/csv` | Bearer | Exportar todas las tareas como CSV |
| `GET` | `/api/items/:id/dependencies` | Bearer | Obtener dependencias de tarea |

### 8.4 Logs (`/api/logs`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/logs` | Admin | Lista logs (paginados, filtrables por usuario) |
| `POST` | `/api/logs` | Bearer | Crea entrada de log |

### 8.5 Rutas adicionales (definidas pero no montadas)

Los siguientes módulos existen en `api/src/routes/` pero **no están montados** en `api/src/index.ts`:

- `attachments.ts` — Adjuntos
- `comments.ts` — Comentarios
- `dependencies.ts` — Dependencias
- `history.ts` — Historial
- `notifications.ts` — Notificaciones
- `projects.ts` — Proyectos
- `sessions.ts` — Sesiones
- `stats.ts` — Estadísticas
- `tags.ts` — Etiquetas

Para habilitarlos, agregar en `api/src/index.ts`:
```typescript
import attachmentsRouter from './routes/attachments.js'
app.use('/api/attachments', authMiddleware, attachmentsRouter)
```

### 8.6 Health Check

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/health` | Ninguna | Verifica que la API y la DB están operativas |

---

## 9. Autenticación y Seguridad

### 9.1 JWT

- **Access token**: 30 minutos, tipo `access`, incluye `jti` (UUID v4) para blacklist
- **Refresh token**: 7 días, tipo `refresh`, no usable para API (solo para renovar access)
- **Algoritmo**: HS256
- **Blacklist**: Tabla `token_blacklist` en PostgreSQL, limpieza automática de entries >8 días

### 9.2 Protecciones implementadas

| Protección | Implementación | Detalle |
|------------|---------------|---------|
| Rate limiting | `express-rate-limit` | Login: 10 req/15min, API: 200 req/min |
| CORS estricto | `cors` | Solo orígenes configurados, credentials: true |
| Helmet | `helmet` | CSP, XSS, frame options, HSTS, no-sniff |
| Validación de entrada | Middleware custom | UUID en params, email regex, label length, progress 0-100, time_end > time_start |
| Body limit | `express.json({ limit: '1mb' })` | Previene payloads grandes |
| Password hashing | `bcryptjs` | Salt rounds 10 (CRUD), 12 (seed en initDB) |
| Timing attack protection | Dummy hash comparison | Tiempo constante en login fallido |
| Owner/Admin check | Middleware | Solo owner o admin puede editar/eliminar tareas |
| Token invalidation | Blacklist DB | En password change y user delete |
| Password policy | Mínimo 8 caracteres | Tanto en create como change-password |
| Role whitelist | Solo `Admin` o `Usuario` | Rechaza roles inválidos |
| Force password change | `debe_cambiar_password` | Seed users y reset-password lo activan |

### 9.3 Headers de seguridad

**Nginx** (`nginx.conf` — puerto 8080):

```nginx
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

**API** (`helmet` — puerto 3000): helmet retorna `X-Frame-Options: SAMEORIGIN` por defecto. Las requests a `/api/` pasan por nginx que retorna `DENY` (el header de nginx sobreescribe el de la API cuando se accede por el puerto 8080).

### 9.4 Docker security

- API: `appuser` non-root (UID 1000)
- Nginx: `nginx` non-root con permisos en `/var/cache/nginx` y `/run/nginx.pid`
- PostgreSQL: contraseña desde env var, no hardcodeada
- Sin secrets en el repositorio (`.env.*` en `.gitignore`)

---

## 10. Frontend

### 10.1 Composables

| Composable | Función |
|------------|---------|
| `useTheme()` | Alterna dark/light, persiste en `localStorage` |
| `useExcelExport()` | Exportación asíncrona a Excel con ExcelJS |
| `useDragDrop()` | Estado de arrastrar y soltar |
| `useKeyboardShortcuts()` | Atajos: N=nuevo, E=editar, Del=eliminar, Ctrl+F=buscar |
| `useTooltip()` | Posicionamiento de tooltips |
| `useSkeletonLoader()` | Placeholder tipo skeleton durante carga |

### 10.2 Store principal (`authStore.ts`)

- **Estado**: `user`, `token`, `usuarios`, `activityLogs`, `isLoading`, `error`
- **Computed**: `isAuthenticated`, `isAdmin`, `mustChangePassword`, `usuariosDisponibles`
- **Persistencia**: `localStorage` para `user`, `token`

### 10.3 Proxy de desarrollo

`vite.config.ts` redirige `/api` → `http://localhost:3000` en desarrollo. En Docker, nginx hace el mismo proxy internamente.

---

## 11. Despliegue

### 11.1 Docker Compose (recomendado para producción)

```bash
# Configurar
cp .env.docker.example .env.docker
# Editar .env.docker con valores seguros

# Construir e iniciar
docker compose --env-file .env.docker up -d --build

# Ver logs
docker compose logs -f api

# Detener
docker compose down

# Detener y eliminar datos
docker compose down -v
```

### 11.2 Vercel (solo frontend)

El proyecto actual contiene una configuración para deployar solo el frontend estático en Vercel. La API debe servir desde Docker.

```bash
# Deploy
npx vercel --prod
```

**Limitaciones**:
- La API no está en Vercel. El login no funcionará desde `gantt-bi-epem.vercel.app`
- `VITE_API_URL` en `vercel.json` apunta a `https://${VERCEL_URL}` (el propio dominio de Vercel), pero no hay API allí
- Solo útil como preview visual del UI
- `authStore.ts` usa `/api` hardcodeado, así que buscaría `/api/users/login` en el dominio de Vercel

Para habilitar la API completa en Vercel se necesita:
1. Base de datos PostgreSQL accesible desde internet (Neon, Supabase, Railway)
2. Rate limit con store externo (Upstash Redis) — el in-memory no funciona en serverless
3. Configurar env vars en Vercel: `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`
4. Restaurar `api/index.ts` como serverless function en `vercel.json`
5. Cambiar `authStore.ts` para usar `VITE_API_URL` en vez de `/api` hardcodeado

### 11.3 Sin Docker (desarrollo local)

```bash
# 1. PostgreSQL corriendo en localhost:5432

# 2. API
cd api
npm install
DATABASE_URL=postgresql://user:pass@localhost:5432/gantt_db \
JWT_SECRET=my-secret \
CORS_ORIGIN=http://localhost:5173 \
npm run dev

# 3. Frontend
npm install
npm run dev
```

---

## 12. Tests

### 12.1 Tests de regresión automatizados

```bash
# Tests de integridad (64 tests)
node e2e/test-integrity.cjs

# Tests de seguridad (38 tests)
node e2e/test-security-regression.cjs
```

Ambos tests requieren la API corriendo en `localhost:3000`.

### 12.2 Qué validan

**Integridad** (64 tests):
- Auth & login (7 tests)
- UUID validation (10 tests)
- Input validation (10 tests)
- Column whitelist / SQL injection (2 tests)
- RBAC (1 test)
- Token blacklist (7 tests)
- Rate limiting (1 test)
- Bulk operations (6 tests)
- Row delete restriction (2 tests)
- DB check constraints (2 tests)
- CORS & security headers (2 tests)
- Logs endpoint (4 tests)
- Protected user endpoints (2 tests)

**Seguridad** (38 tests):
- JWT secret & token validation (6 tests)
- CORS & security headers (3 tests)
- Role validation (3 tests)
- Password policy (3 tests)
- Input validation (6 tests)
- Logs require admin (4 tests)
- Login matching (3 tests)
- Timing attack protection (1 test)
- Password not leaked (5 tests)
- Seed users must change password (1 test)
- UUID validation regression (3 tests)

---

## 13. Mantenimiento

### 13.1 Limpieza de token blacklist

Se ejecuta automáticamente al iniciar la API (`init.ts`). Elimina entries >8 días.

### 13.2 Backup de base de datos

```bash
# Crear backup
docker compose exec db pg_dump -U gantt_user gantt_db > backup_$(date +%Y%m%d).sql

# Restaurar
cat backup_YYYYMMDD.sql | docker compose exec -T db psql -U gantt_user gantt_db
```

### 13.3 Actualizar la aplicación

```bash
git pull origin master
docker compose --env-file .env.docker up -d --build
```

### 13.4 Logs

```bash
docker compose logs api    # API logs
docker compose logs app     # Nginx logs
docker composite logs db    # PostgreSQL logs
docker compose logs -f      # Seguir todos los logs en tiempo real
```

---

## 14. Resolución de Problemas

| Problema | Causa probable | Solución |
|----------|---------------|----------|
| API devuelve 500 | `DATABASE_URL` incorrecta o DB no lista | Verificar env var, esperar healthcheck de DB |
| Login devuelve 429 | Rate limit activo (10 intentos/15min) | Esperar 15 minutos o reiniciar API container |
| CORS error en navegador | `CORS_ORIGIN` no incluye el origen | Agregar origen a `CORS_ORIGIN` env var |
| Nginx devuelve 502 | API no está corriendo | `docker compose ps api`, verificar healthcheck |
| "debe_cambiar_password" loop | Front no maneja el flag | Verificar que `ChangePasswordModal.vue` está cargando |
| Token invalidado después de reset | Token blacklist activa | Es comportamiento correcto, hacer login de nuevo |
| Build falla en Vercel | Config incorrecta | Verificar `vercel.json` usa `@vercel/static-build` sin serverless function |
| Docker build falla | Registry o red | Reintentar con `docker compose build --no-cache` |