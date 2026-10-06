# PROMY — Handoff actual

> Estado documentado sobre `origin/main` en `2b7c7b2607e88284dbcd5a395c5e40931ad9e951`. Este documento describe código versionado y distingue lo que aún requiere infraestructura, datos públicos o validación real.

## Propósito y superficies

PROMY es una plataforma local de promociones: clientes descubren y canjean beneficios, comercios administran oferta y validan canjes, y administración modera y audita.

| Superficie | Ubicación | Responsabilidad |
|---|---|---|
| API | `promy-api/` | Express/TypeScript, reglas de dominio, Prisma/MySQL, autenticación, proveedores y operaciones. |
| Web | `promy-web/` | Panel React para Commerce, Admin y SuperAdmin. |
| Landing | `promy-landing/` | Pre-launch, solicitud beta, estadísticas públicas y legales. |
| Mobile | `promy-mobile/` | Expo/React Native para Client y Commerce. |

## Arquitectura y flujo

El producto es un monolito modular: la API concentra reglas y persistencia MySQL; Web, Landing y Mobile son clientes separados. Prisma gestiona esquema y migraciones. Redis, Sentry, Resend y S3/R2 son integraciones opcionales o dependientes del entorno; código y tests no certifican una instancia real.

Los roles son `CLIENT`, `COMMERCE`, `ADMIN` y `SUPER_ADMIN`. Un flujo normal es: alta de usuario/comercio, creación y moderación de promoción, descubrimiento público, inicio de canje y validación por el comercio mediante QR o código manual. La API protege cupos, estados y vigencias, y las acciones administrativas quedan auditadas.

Módulos principales: auth/sesiones, comercios, promociones, categorías, catálogo/búsqueda/mapa, canjes, notificaciones, auditoría, privacidad/retención, uploads, cache y analytics de impresiones/aperturas.

## Billing, Mercado Pago y SuperAdmin

Billing soporta modos `OFF`, `SCHEDULED` y `ON`, cobertura beta, cobertura bonificada, pagos manuales idempotentes y acceso por comercio. Existe provider fake para QA y provider Mercado Pago con enrolamiento, webhooks y recibos. La configuración, credenciales, plan y validación de un provider real son externas al repositorio.

La reconciliación observa al provider y agrega registros append-only `MATCH`, `MISMATCH` o `UNAVAILABLE`; un mismatch no sincroniza automáticamente estado remoto sobre local. Configuración global, coberturas, pagos manuales y reconciliación requieren `SUPER_ADMIN`; `ADMIN` no puede operar esas rutas.

El panel SuperAdmin reúne dashboard, comercios, categorías, promociones, billing, auditoría y solicitudes beta, con tablas, paginación e inspectores. Commerce incluye suscripción y estadísticas modernas de promociones.

## Operaciones y staging

Block 19 agregó preparación reproducible, no certificación de infraestructura. Los runbooks están en `docs/operations/` y los wrappers en `tools/operations/`: preflight, smoke read-only/full-loop explícito, backup/restore aislado, chequeo de rollback por SHA e incident response.

Staging real, proxy/TLS, bloqueo del origin, backup off-site, restore, rollback ejecutado, alertas y proveedores reales necesitan evidencia externa. No se cierran por existir scripts.

## Landing y release público

La Landing modular está integrada. CI valida `npm test`, `npm run typecheck` y `npm run build:local`. El build público (`npm run build`) sigue bloqueado intencionalmente hasta recibir datos públicos y jurídicos definitivos.

Un release público exige, sin valores inventados:

- `VITE_API_BASE_URL`
- `VITE_PANEL_BASE_URL`
- `VITE_LEGAL_RESPONSIBLE`
- `VITE_LEGAL_ADDRESS`
- `VITE_RETENTION_POLICY`
- `VITE_PRIVACY_EMAIL`
- `VITE_SUPPORT_EMAIL`
- `VITE_COMPLAINTS_EMAIL`
- `VITE_LEGAL_REVIEWED=true`

No crear `.env.release` con placeholders para sortear ese control.

## Privacidad, analytics y pendientes

La baja de cliente preserva la integridad histórica de canjes según el modelo actual. El repo incluye reporte de retención y paridad legal, pero responsable, contactos, plazos, backup y revisión jurídica final son externos. Analytics registra impresiones y aperturas y alimenta vistas de Commerce.

Pendientes reales: staging aislado, TLS/proxy/origin, backup/restore, rollback, Sentry/alertas, Resend, R2/S3, QA físico Android/iOS, branch protection y datos legales/URLs públicas de Landing.

## QA local

Ejecutar dentro de cada paquete. La integración API requiere `TEST_DATABASE_URL` apuntando a una base aislada cuyo nombre contenga `test`, `tests` o `qa`; nunca usar datos reales.

```powershell
# API
cd promy-api
npm test
npm run build
npm run test:integration
node scripts/qa-billing-domain-smoke.js
node scripts/qa-billing-reconciliation-smoke.js

# Web
cd ../promy-web
npm test
npm run typecheck
npm run build

# Landing: CI/local, no release público
cd ../promy-landing
npm test
npm run typecheck
npm run build:local

# Mobile
cd ../promy-mobile
npm test
npm run typecheck
```

## CI y referencias

`.github/workflows/promy-ci.yml` ejecuta API, API Integration con MySQL 8.4/Redis efímeros, Web, Landing, Mobile y Release Artifact. Landing usa `build:local`; eso no desbloquea release público. Release Artifact empaqueta un SHA después de los jobs previos y verifica manifest, checksums y exclusiones.

- [Tracker de remediación](PROMY_REMEDIATION_TRACKER.md)
- [Snapshot histórico](audits/2026-09-10/README.md)
- [Runbooks](operations/)
