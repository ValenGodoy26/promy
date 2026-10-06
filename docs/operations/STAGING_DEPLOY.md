# Deploy de staging

Este procedimiento prepara un ambiente separado; no autoriza un deploy a producción. Staging usa `APP_ENV=production` y `NODE_ENV=production` porque la API no tiene un cuarto valor de entorno. La separación se logra con hosts, DB, secretos, bucket, Redis prefix y Sentry environment propios.

## Precondiciones

1. Existe un artifact de GitHub Actions para el SHA aprobado, con sus cuatro paquetes, manifest y checksums.
2. El entorno entrega TLS, proxy, firewall y un origin API no accesible directamente desde Internet.
3. Las variables se provisionan fuera de Git y fuera del artifact usando el template `templates/api-staging.env.example`.
4. MySQL 8.4 aislado, usuario de operación de mínimos privilegios y una ventana de migración están aprobados.
5. Se conoce el último SHA estable para rollback y existe su artifact validado.

## Secuencia verificable

1. Descargar el artifact del SHA y ejecutar `node tools/operations/release-preflight.mjs` con `STAGING_ARTIFACT_PATH` y `STAGING_EXPECTED_SHA`.
2. Ejecutar `node tools/operations/staging-preflight.mjs`. Debe terminar `PASS`; los `WARN` requieren decisión explícita.
3. Descomprimir cada paquete en `releases/<sha>/`; no editar archivos dentro del artifact.
4. En `promy-api`, ejecutar `npm ci`, `npx prisma generate` y `npx prisma migrate deploy` usando sólo la configuración de staging.
5. Ejecutar seed bootstrap únicamente si la DB nueva lo requiere y con una cuenta ADMIN QA separada. Nunca cargar credenciales demo ni datos de producción.
6. Iniciar API y confirmar `GET /api/health` y `GET /api/readiness`.
7. Publicar Web y Landing desde los paquetes del mismo SHA, con sus URLs de API de staging compiladas explícitamente.
8. El proxy/TLS pertenece al entorno: debe terminar HTTPS, reenviar headers sólo desde su IP/CIDR y bloquear acceso directo al origin API.
9. Ejecutar `node tools/operations/staging-smoke.mjs` con cuentas QA. El modo `--full-loop` exige los flags de mutación documentados en `STAGING_SMOKE.md`.

## Post-deploy y abort

Registrar SHA, hora UTC, health, readiness, smoke y operador como evidencia externa. Abortar y pasar a [ROLLBACK.md](ROLLBACK.md) si falla una migración, readiness, smoke, proxy/TLS, autenticación o una dependencia crítica elegida para el ambiente.
