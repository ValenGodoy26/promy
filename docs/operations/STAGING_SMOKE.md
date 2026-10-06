# Smoke de staging

El comando `node tools/operations/staging-smoke.mjs` es read-only salvo `--full-loop`. Requiere `STAGING_QA_ENVIRONMENT=1`, `STAGING_ALLOWED_HOSTS` con hosts exactos, URLs HTTPS de API/Web y cuentas QA. Nunca imprimir passwords.

El modo read comprueba health, readiness, Web, login ADMIN/COMMERCE/CLIENT, dashboard ADMIN, perfil/promociones/canjes Commerce, catálogo e historial Client.

El modo `--full-loop` es destructivo y además exige `ALLOW_STAGING_MUTATIONS=1`, `STAGING_QA_CITY_ID` y `STAGING_QA_CATEGORY_ID`. Crea una promoción QA, la envía a revisión, ADMIN la publica, CLIENT la descubre y canjea, COMMERCE valida y CLIENT confirma `SUCCESS`. Sólo usar cuentas y datos QA preparados. El email real, upload real, Sentry/alerta, backup/restore y rollback se prueban como ejercicios separados y documentados.
