# Despliegue en Producción (100% Open Source)

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│  Vercel (Frontend + API - Monorepo)                        │
│  • Frontend: Static Build (Vite)                           │
│  • API: Serverless Functions (Node.js)                      │
│  • URL: https://tu-proyecto.vercel.app                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Neon (PostgreSQL Serverless - Open Source)                 │
│  • Branching, escala automática                            │
│  • SSL required                                            │
└─────────────────────────────────────────────────────────────┘
```

## 1. Crear Base de Datos en Neon

1. Ir a [Neon.tech](https://neon.tech)
2. Crear cuenta gratuita
3. Crear nuevo project:
   - Name: `gantt-db`
   - Region: más cercana a tus usuarios
4. En Dashboard → Connection Details → copy Connection string
   - **Importante**: Agregar `?sslmode=require` al final
   - Ejemplo: `postgresql://user:pass@host/db?sslmode=require`

## 2. Configurar Schema en Neon

Ejecutar el schema en Neon. Copiar contenido de `database/schema.sql` y ejecutar en:
- Neon Dashboard → SQL Editor
- O usar `psql` con connection string

## 3. Desplegar en Vercel

### Opción A: Vercel Dashboard

1. Ir a [vercel.com](https://vercel.com)
2. Importar repositorio `vue-gantt`
3. Configurar:
   - Framework: Vite (o Other)
   - Root Directory: `.` (root del repo)
4. **Environment Variables** (en Vercel Dashboard → Settings → Environment Variables):
   - `DATABASE_URL`: Connection string de Neon (con `?sslmode=require`)
   - `VITE_API_URL`: `@vercel_url` (se resuelve automáticamente)

5. Deploy!

### Opción B: Vercel CLI

```bash
npm i -g vercel
vercel --prod
```

Agregar variable en Vercel Dashboard después.

## 4. Verificar Despliegue

```bash
# Test API
curl https://tu-proyecto.vercel.app/api/health
# Esperado: {"status":"ok","timestamp":"..."}

# Test login
curl -X POST https://tu-proyecto.vercel.app/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"usuario":"emmanuel.villasanti","password":"epem2023@@"}'
```

## URLs y Credenciales

- **Frontend:** `https://tu-proyecto.vercel.app`
- **API:** `https://tu-proyecto.vercel.app/api`
- **Admin:** emmanuel.villasanti / epem2023@@

## Estructura de Archivos

```
vue-gantt/
├── api/                    # Serverless Functions
│   ├── health.ts          # GET /api/health
│   ├── users.ts           # GET/POST /api/users
│   ├── users/login.ts     # POST /api/users/login
│   ├── rows.ts            # GET/POST /api/rows
│   ├── rows/[id].ts       # PUT/DELETE /api/rows/:id
│   ├── items.ts           # GET/POST /api/items
│   └── items/[id].ts      # PUT/DELETE /api/items/:id
├── lib/
│   └── db.ts              # Neon SQL client
├── src/                   # Frontend Vue
├── vercel.json            # Vercel config (monorepo)
└── package.json
```

## Troubleshooting

### CORS errors
La API de Vercel ya incluye CORS headers por defecto. Si hay problemas, verificar que el frontend usa la misma URL.

### Connection refused
1. Verificar `DATABASE_URL` en Vercel (Settings → Environment Variables)
2. Verificar que Neon permite conexiones externas:
   - Neon Dashboard → Settings → Networking → Allow all

### 500 Internal Server Error
1. Revisar logs: Vercel Dashboard → Functions → Logs
2. Verificar que `DATABASE_URL` es válido y tiene `?sslmode=require`

### SSL errors
**Obligatorio**: El connection string debe terminar con `?sslmode=require`

```
postgresql://user:password@host/db?sslmode=require
```

## Costos

| Servicio | Plan Gratuito | Límites |
|----------|--------------|---------|
| Vercel | ✓ | 100GB bandwidth/mes |
| Neon | ✓ | 0.5GB RAM, 1GB storage |

## Notas Importantes

- El plan gratuito de Neon tiene límites: 0.5GB RAM, 1GB storage
- Vercel Hobby: 100GB bandwidth/mes
- Para producción con muchos usuarios, considerar planes de pago
- Neon es open source a nivel protocolo (PostgreSQL), la plataforma es propietaria