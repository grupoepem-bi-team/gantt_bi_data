# MEMORIA - BI Gantt EPEM

## Estado del Proyecto (27 Mayo 2026)

### Stack
- **Frontend**: Vue 3 + Vite + Pinia + TypeScript
- **API Docker**: Express + pg (puerto 3000)
- **API Vercel**: Serverless Functions + Neon SQL
- **DB**: PostgreSQL (Docker: gantt_db, gantt_user / gantt_password)
- **Contenedores**: gantt_postgres (5432), gantt_api (3000), gantt_app (8080)
- **Deploy target**: Vercel (frontend + serverless) + Neon (PostgreSQL serverless)

### Usuarios
| Usuario | Nombre | Email | Password | Rol |
|---------|--------|-------|----------|-----|
| Admin | emmanuel.villasanti | emmanuel.villasanti@epem.com | epem2023@@ | Admin |
| Jean Sandoval | Jean Sandoval | jean.sandoval@epem.com | jean123 | Usuario |
| Jesus Alvarenga | Jesus Alvarenga | jesus.alvarenga@epem.com | jesus123 | Usuario |

### Login API
- Acepta `nombre` OR `email` (case-insensitive con ILIKE para nombre)
- Timing attack protection: bcrypt.compare con hash dummy si usuario no existe
- JWT con JTI (uuid) para blacklist de sesiones
- Query: `SELECT * FROM users WHERE nombre ILIKE $1 OR email = $1`

### Base de Datos
- 3 users, 6 rows (categorias), ~18 items con multi-assignments y created_by
- Tablas: `users`, `gantt_rows`, `gantt_items`, `gantt_dependencies`, `gantt_item_assignments`, `activity_logs`, `token_blacklist`
- FK: `gantt_items.row_id` → `gantt_rows(id)` ON DELETE RESTRICT
- CHECK: `gantt_items` tiene `chk_time_range CHECK (time_end > time_start)` y `progress >= 0 AND progress <= 100`
- Schema: `database/schema.sql` | Seed: `api/src/db/init.ts`

---

## Seguridad e Integridad (implementado esta sesion)

### Autenticacion y Autorizacion
- **JWT con JTI**: Cada token incluye un `jti` (UUID) unico para blacklist de sesiones
- **Token blacklist**: Tabla `token_blacklist` (user_id, token_jti, fecha_creacion) — sin FK para sobrevivir eliminacion de usuario
- **Sesion invalidada al**: eliminar usuario (`user-deleted-{userId}`), cambiar password (JTI especifico)
- **Rate limiting**: 10 req/15min en login, 200 req/min en API general
- **CORS**: Solo origenes permitidos (localhost:5173, localhost:8080, CORS_ORIGIN)
- **Helmet**: Headers de seguridad (X-Frame-Options, X-Content-Type-Options, etc.)
- **Nginx**: CSP, HSTS, X-Frame-Options DENY en docker

### Validaciones API
| Validacion | Endpoint | Error |
|------------|----------|-------|
| UUID en :id params | items, users, rows | 400 "Invalid id: must be a valid UUID" |
| time_end > time_start | POST/PUT items | 400 "time_end must be after time_start" |
| Label no vacio, max 255 | POST items, rows | 400 "Missing required fields" / "Label must be at most 255 characters" |
| Email formato | POST/PUT users | 400 "Invalid email format" |
| Password min 6 chars | POST users, change-password | 400 "Password must be at least 6 characters" |
| Nombre 2-255 chars | POST/PUT users | 400 "Name must be between 2 and 255 characters" |
| Row existe antes de crear item | POST items | 400 "Row not found" |
| Column whitelist en UPDATE | PUT items, bulk | Solo campos permitidos, ignora desconocidos |
| Bulk limites | POST/PUT bulk | 400 "Maximum 100 items/updates per bulk operation" |

### RBAC (Role-Based Access Control)
| Accion | Admin | Usuario |
|--------|-------|---------|
| Crear tarea | Si | Si |
| Editar/eliminar tarea | Todas | Solo las que creo (created_by) |
| Bulk create/update items | Si | No (403) |
| Crear/eliminar/renombrar categorias | Si | No |
| Crear/eliminar usuarios | Si | No (403) |
| Cambiar password | Propio | Propio |
| Ver admin sidebar | Si | No |
| Switch user | Si | No |

### Protecciones Adicionales
- **Timing attack**: bcrypt.compare con hash dummy cuando usuario no existe (diff <10ms)
- **Row delete restrict**: No se puede eliminar row con items (API check 400 + FK RESTRICT)
- **Cannot delete self**: DELETE /users/:id verifica que no seas tu mismo
- **Logs count respeta filtro**: `GET /logs?usuario_id=X` ahora filtra el COUNT correctamente
- **Bulk operations en transaccion**: BEGIN/COMMIT/ROLLBACK en POST/PUT bulk
- **Batch INSERT en assignments**: 1 query en vez de N+1 en `setItemAssignments`
- **Label validation en BD**: `CHECK (length(trim(label)) > 0)` en schema.sql

---

## Arquitectura Frontend

### Estructura de Componentes
```
App.vue
├── LoginForm.vue (v-if="!authStore.isAuthenticated")
├── ChangePasswordModal.vue
├── AdminSidebar.vue (v-if showAdminSidebar, solo admin)
├── GanttChart.vue (v-if="!calendarViewMode")
│   ├── GanttList.vue (panel izquierdo: categorias)
│   ├── GanttTimeline.vue (panel derecho: barras)
│   └── ItemModal.vue (crear/editar tarea, 3 columnas)
├── CalendarView.vue (v-if="calendarViewMode")
│   └── CalendarModal.vue (crear tarea, 3 columnas)
└── UserSelector.vue (v-if="authStore.isAdmin", switch user)
```

### Layout Principal
- **Header**: Logo + "BI Gantt EPEM" + Calendar toggle + Admin btn + Profile btn (con logout)
- **GanttChart**: Panel izquierdo (categorias 260px) + Timeline (flex:1)
- **Toolbar**: Dentro de gantt-timeline-header: search, filtros, "Nueva", "Exportar", tema
- **Zoom**: Botones flotantes en esquina inferior izquierda
- **Modal**: 1320x840, 3 columnas (Datos 300px | Usuarios flex:1 | Planif 320px)
- **Calendar**: Mes/Semana/Dia, grid 7 columnas, day cells 189x80

---

## Tests E2E (Playwright)

### Archivos
| Archivo | Descripcion | Resultado |
|---------|-------------|-----------|
| `e2e/test-regression-full.cjs` | 117 tests: API, layout, modal, calendar, permisos, responsive, CRUD | 117/117 OK |
| `e2e/test-integrity.cjs` | 76 tests: UUID, timing attack, token blacklist, RBAC, whitelist, validaciones | 76/76 OK |
| `e2e/test-login-logout.cjs` | 37 tests: login/logout/re-login de 3 usuarios | 37/37 OK |
| `e2e/test-responsive-audit.cjs` | 7 breakpoints: 0 issues de overflow/overlap | 0 issues |
| `e2e/test-dimensions-audit.cjs` | 160 elementos medidos con posicion | OK |

### Comandos
```bash
# Correr tests de integridad
node e2e/test-integrity.cjs

# Correr regresion completa
node e2e/test-regression-full.cjs

# Rebuild Docker
docker compose up -d --build api app

# Build solo frontend
npm run build

# Limpiar token blacklist (debug)
docker exec gantt_postgres psql -U gantt_user -d gantt_db -c "TRUNCATE token_blacklist;"
```

---

## Archivos Clave (integridad)

| Archivo | Descripcion |
|---------|-------------|
| `api/src/middleware/auth.ts` | JWT auth + JTI blacklist + `blacklistAllUserTokens` + `blacklistToken` |
| `api/src/middleware/validators.ts` | `validateUUID`, `validateEmail` |
| `api/src/routes/users.ts` | Login con timing protection, RBAC, email/nombre validation |
| `api/src/routes/items.ts` | Column whitelist, UUID, time_end>time_start, row_id FK check, bulk transactions |
| `api/src/routes/rows.ts` | UUID validation, label length validation |
| `api/src/routes/logs.ts` | Fixed count query, accion length validation |
| `api/src/db/init.ts` | CHECK constraint, RESTRICT FK, token_blacklist table |
| `database/schema.sql` | Full schema con CHECK, RESTRICT, token_blacklist |
| `api/lib/auth.ts` | Vercel auth con JTI |
| `api/users/login.ts` | Vercel login con JTI |

---

## Notas Criticas

- **`authStore.usuariosDisponibles`** (NO `users`) — store expone `usuarios` y `usuariosDisponibles`
- **authMiddleware es async** — hace query a BD para verificar token blacklist
- **Token blacklist no tiene FK a users** — para que entries persistan luego de eliminar usuario
- **Cambiar password invalida token viejo** — solo el JTI especifico, nuevo token sigue funcionando
- **Eliminar usuario invalida todos sus tokens** — marca `user-deleted-{userId}` en blacklist
- **Rate limiter en memoria** — se reinicia al reiniciar container (aceptable para single-instance)
- **JWT_SECRET en .env.docker**: `gantt-bi-epem-jwt-secret-change-in-production-2026` — cambiar para produccion
- **Bulk create/update usan transacciones** — BEGIN/COMMIT/ROLLBACK con getClient()
- **setItemAssignments usa batch INSERT** — 1 query en vez de N+1
- **gantt_items.row_id FK es RESTRICT** — no se puede eliminar row con items (API check + DB constraint)

---

## Pendientes / Next Steps

### Alta prioridad
1. **Deploy Vercel + Neon**: Crear Neon DB, correr schema.sql, deploy a Vercel
2. **Cambiar JWT_SECRET** para produccion (usar env var seguro)

### Mejoras futuras
- Refresh tokens para extension de sesion seamless
- Redis para rate limiting en multi-instance
- HTTPS/TLS termination (nginx o load balancer) para produccion
- Zod/Joi schema validation para input del backend
- Limpiar token_blacklist periodicamente (entries con fecha_expiracion < now)

---

## Estructura de Archivos (actual)
```
vue-gantt/
├── api/
│   ├── src/
│   │   ├── db/
│   │   │   ├── connection.ts (pg pool + getClient para transacciones)
│   │   │   └── init.ts (seed data + CHECK + RESTRICT + token_blacklist)
│   │   ├── middleware/
│   │   │   ├── auth.ts (async authMiddleware, JTI blacklist, generateToken con jti)
│   │   │   └── validators.ts (validateUUID, validateEmail)
│   │   └── routes/
│   │       ├── users.ts (login timing-attack, CRUD, change-password, blacklist)
│   │       ├── items.ts (whitelist, UUID, time validation, bulk transactions)
│   │       ├── rows.ts (UUID, label validation)
│   │       └── logs.ts (fixed count, accion length)
│   ├── lib/
│   │   ├── auth.ts (Vercel auth con JTI)
│   │   └── db.ts (Neon client)
│   ├── users/login.ts, change-password.ts (Vercel serverless)
│   ├── items.ts, rows.ts, logs.ts, health.ts (Vercel serverless)
│   └── index.ts (CORS, helmet, rate limiting, authMiddleware)
├── database/
│   └── schema.sql (14+ tablas + CHECK + RESTRICT + token_blacklist)
├── src/
│   ├── assets/themes.css
│   ├── components/
│   │   ├── GanttChart.vue (toolbar, zoom, search, filtros)
│   │   ├── GanttList.vue (categorias, admin rename/delete)
│   │   ├── GanttTimeline.vue (items, overlay btns, context menu, drag/resize)
│   │   ├── ItemModal.vue (3 cols: Datos|Usuarios|Planif)
│   │   ├── CalendarView.vue (mes/semana/dia)
│   │   ├── CalendarModal.vue (3 cols, mismo layout)
│   │   ├── AdminSidebar.vue (usuarios + actividad tabs)
│   │   ├── LoginForm.vue
│   │   ├── UserSelector.vue
│   │   └── ChangePasswordModal.vue
│   ├── composables/useExcelExport.ts
│   ├── stores/authStore.ts (JWT + authHeaders + auto-logout 401)
│   ├── types/gantt.ts
│   ├── utils/date.ts
│   └── App.vue
├── e2e/ (tests Playwright)
├── nginx.conf (security headers, proxy)
├── .env.docker (JWT_SECRET, CORS_ORIGIN, DATABASE_URL)
├── docker-compose.yml
├── vercel.json
└── MEMORIA.md
```