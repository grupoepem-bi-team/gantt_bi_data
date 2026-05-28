# Buenas Prácticas — Despliegue y Mantenimiento

## Levantar Docker

Siempre usar `--env-file` para leer las variables de `.env.docker`:

```bash
docker compose --env-file .env.docker up -d
```

No usar `docker compose up -d` sin `--env-file`. Los defaults del `docker-compose.yml` son solo fallback para desarrollo rápido y **no son seguros para producción** (passwords débiles, JWT sin configurar).

## Actualizar el repositorio

```bash
git pull origin master
docker compose --env-file .env.docker up -d --build
```

El `--build` reconstruye las imágenes con el código nuevo. Sin él, Docker usa las imágenes cacheadas y los cambios no se aplican.

## Cambios que requieren recrear la base de datos

Si el pull incluye cambios en `api/src/db/init.ts` o `database/schema.sql` que alteran tablas existentes:

```bash
docker compose down
docker volume rm vue-gantt_postgres_data
docker compose --env-file .env.docker up -d --build
```

Esto elimina la DB y la recrea desde cero con los datos seed. **Se pierden todos los datos**.

Si hay datos que no podés perder, hacé backup antes:

```bash
docker compose exec db pg_dump -U gantt_user gantt_db > backup_$(date +%Y%m%d).sql
```

## Cambios que NO requieren recrear la DB

- Cambios en el frontend (`src/`)
- Cambios en rutas de la API (`api/src/routes/`)
- Cambios en el middleware (`api/src/middleware/`)
- Cambios en nginx (`nginx.conf`)
- Cambios en los Dockerfiles

Con `--build` alcanza.

## Variables de entorno

### Antes del primer deploy

1. Copiar el template: `cp .env.docker.example .env.docker`
2. Editar `.env.docker` con valores seguros (ver sección de Checklist)
3. **Nunca** commitear `.env.docker` al repositorio (está en `.gitignore`)

### Checklist de `.env.docker`

| Variable | Verificar |
|----------|-----------|
| `POSTGRES_PASSWORD` | Que no sea el default. Mínimo 12 caracteres |
| `DATABASE_URL` | El password debe coincidir con `POSTGRES_PASSWORD` |
| `JWT_SECRET` | Que no sea el default. Mínimo 32 caracteres aleatorios |
| `ADMIN_INITIAL_PASSWORD` | Mínimo 8 caracteres (policy de la app) |
| `CORS_ORIGIN` | Debe incluir el origen del frontend (ej: `http://localhost:8080`) |

## Tests de regresión

Ejecutar después de cada actualización para verificar que nada se rompió:

```bash
export ADMIN_INITIAL_PASSWORD="tu_password_admin"
node e2e/test-integrity.cjs
node e2e/test-security-regression.cjs
```

Si el rate limit bloquea los tests (429), reiniciar la API:

```bash
docker compose restart api
```

## Problemas comunes

| Problema | Causa | Solución |
|----------|-------|----------|
| API devuelve 500 al iniciar | `DATABASE_URL` no coincide con `POSTGRES_PASSWORD` | Verificar que ambos coincidan en `.env.docker` |
| Contenedor `app` en `unhealthy` | Healthcheck no resuelve `localhost` | Ya corregido: usa `127.0.0.1:80` |
| Login devuelve "Credenciales invalidas" | Password del admin fue cambiado viaUI | Usar la password actual, no la del `.env.docker` |
| Login devuelve 429 | Rate limit (10 intentos/15min) | Esperar 15 minutos o `docker compose restart api` |
| API se reinicia en loop | DB password incorrecto | Verificar `DATABASE_URL` y `POSTGRES_PASSWORD` coinciden |
| Cambios no se ven | Imágenes cacheadas | Usar `--build` al levantar |
| Contenedor db se recrea y pierde datos | `docker compose down` elimina todo | Usar `docker compose stop` para detener sin perder datos |

## Detener vs Eliminar

```bash
# Detener sin perder datos (recomendado para apagar)
docker compose stop

# Detener y eliminar contenedores (datos seguros en volumen)
docker compose down

# Detener y eliminar TODO incluida la base de datos
docker compose down -v
```

## Deploy en Vercel

Solo deploya el frontend estático. Sin API funcional:

```bash
npx vercel --prod
```

La app completa (con API) solo funciona via Docker en `localhost:8080`.

## Orden correcto de operaciones

1. `git pull origin master`
2. `docker compose --env-file .env.docker up -d --build`
3. Esperar a que los 3 contenedores estén `healthy`: `docker compose ps`
4. Verificar API: `curl http://localhost:3000/api/health`
5. Verificar app: abrir `http://localhost:8080`
6. Ejecutar tests de regresión