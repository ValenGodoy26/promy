# Auditoría controlada de dependencias de promy-api

Fecha: 2026-09-07

Baseline: `d561782` (`fix(test): restore integration suite`)

Entorno local: Node.js `22.18.0`, npm `10.9.3`, MySQL de integración `promy_integration_test`.

## Resultado

| Métrica | Antes | Después |
| --- | ---: | ---: |
| Total | 16 | 3 |
| Low | 1 | 0 |
| Moderate | 7 | 0 |
| High | 8 | 3 |
| Critical | 0 | 0 |

Las tres entradas restantes representan una sola cadena de tooling: `prisma -> @prisma/config -> deepmerge-ts@7.1.5`.

## Inventario inicial y clasificación

| Paquete reportado | Instalado inicialmente | Fix usado/disponible | Severidad | Clase y ruta | Superficie PROMY | Riesgo de cambio |
| --- | --- | --- | --- | --- | --- | --- |
| `multer` | 2.1.1 | 2.3.0 | High/Moderate | runtime, directa | endpoint multipart de imágenes | bajo dentro de v2; se requiere limitar índices de arrays |
| `sharp` | 0.34.5 | 0.35.4 | High | runtime, directa | recodificación WebP y resize | significativo: minor `0.x` con cambios incompatibles y nuevo libvips |
| `express-rate-limit` / `ip-address` | 8.3.2 / 10.1.0 | 8.7.0 / 10.7.0 | Moderate/High | runtime, directa/transitiva | límites de auth, catálogo, canjes, uploads y SSE | bajo dentro de v8; revisar headers y proxy |
| `@sentry/node` / OpenTelemetry | 10.53.1 / 2.6-2.7 | 10.73.0 / árbol corregido | Moderate | runtime, directa/transitiva | observabilidad opcional | bajo dentro de v10; revisar init y contexto |
| `body-parser` | 2.2.2 | 2.3.0 | Low | runtime, `express -> body-parser` | parsing HTTP de Express | bajo, actualización transitiva compatible |
| `qs` | 6.15.1 | 6.16.0 | Moderate | runtime, `express/body-parser -> qs` | query/body parsing | bajo, actualización transitiva compatible |
| `fast-xml-builder` | 1.1.5 | eliminado del árbol vulnerable | High/Moderate | runtime, `AWS S3 -> XML parser/builder` | uploads S3/R2 | bajo mediante minor del AWS SDK |
| `brace-expansion` 5.x | 5.0.6 | eliminado con Sentry nuevo | High | runtime, `Sentry -> @fastify/otel -> minimatch` | instrumentación opcional | bajo mediante minor de Sentry |
| `brace-expansion` 1.x | 1.1.14 | 1.1.18 | High | dev, `ts-node-dev -> rimraf -> glob -> minimatch` | desarrollo solamente | bajo, actualización transitiva compatible |
| `prisma` / `@prisma/config` / `deepmerge-ts` | 6.19.3 / 6.19.3 / 7.1.5 | no aplicado; npm propone downgrade 6.12 o major | High | tooling, directa/transitiva | CLI de validate/generate/migrate; no runtime de requests | alto si se fuerza Prisma 7/8; exposición práctica baja en PROMY |

## Versiones modificadas

- `@aws-sdk/client-s3`: 3.1037.0 → 3.1127.0.
- `@prisma/client`: 6.19.0 → 6.19.3, alineado con `prisma` 6.19.3.
- `@sentry/node`: 10.53.1 → 10.73.0.
- `@types/multer`: 2.1.0 → 2.2.0.
- `express-rate-limit`: 8.3.2 → 8.7.0.
- `helmet`: 8.1.0 → 8.3.0.
- `multer`: 2.1.1 → 2.3.0.
- `sharp`: 0.34.5 → 0.35.4.
- `typescript`: 6.0.2 → 6.0.3.
- `zod`: 4.3.6 → 4.5.4.
- Transitivas corregidas relevantes: `body-parser` 2.2.2 → 2.3.0, `qs` 6.15.1 → 6.16.0, `brace-expansion` 1.1.14 → 1.1.18 e `ip-address` 10.1.0 → 10.7.0.

El lockfile se redujo de forma marcada porque Sentry 10.73 eliminó del árbol instalado numerosas instrumentaciones externas y AWS SDK reorganizó sus dependencias. No se eliminó el lockfile y `npm ci` fue validado desde cero.

## Ajustes y regresión específica

- Multer conserva `memoryStorage`, 5 MB y allowlist JPEG/PNG/WebP. Se agregó `fieldArrayIndexLimit: 0`, ya que el endpoint no necesita campos array.
- La smoke de uploads prueba imagen PNG real, recodificación WebP, archivo mayor a 5 MB, MIME inválido, magic bytes inválidos, filename hostil e índice array bloqueado. Elimina los archivos creados al finalizar.
- Sharp 0.35.4 instaló su binario en limpio con Node 22, procesó una imagen real y mantuvo resize, WebP, calidad 82 y límites existentes.
- Rate limiting conserva `standardHeaders: true`, `legacyHeaders: false`, memoria local y `trust proxy` sin cambios. La smoke comprueba headers draft-6 y bloqueo 429 después de ocho intentos de login.
- Sentry inicia correctamente desactivado y con un DSN sintácticamente válido sin capturar/enviar eventos. Se sustituyó `originalUrl` por `req.path` en contexto para no incluir query strings potencialmente sensibles; nunca se agregaron headers, body, passwords ni tokens.
- Prisma permanece en 6.19.3. `prisma` y `@prisma/client` están alineados; `postinstall` genera el cliente para que `npm ci && npm test` sea reproducible. No se modificaron schema ni migraciones.

## Vulnerabilidad aceptada temporalmente

`deepmerge-ts < 8` puede agotar el stack al recibir dos grafos JavaScript autorreferenciales. PROMY sólo lo recibe dentro de `@prisma/config`, durante comandos CLI controlados; no existe una ruta HTTP ni datos de usuario que lleguen a esa función. El propio análisis de Prisma indica baja explotabilidad práctica en ese contexto.

No se aplicó un override transitivo a `deepmerge-ts@8` porque Prisma fija 7.1.5 y no garantiza compatibilidad. Tampoco se migró a Prisma 7/8: exige cambios de ESM, driver adapter, `prisma.config`, generación y seed que exceden una corrección controlada. La recomendación es actualizar cuando Prisma publique una versión compatible que incorpore `deepmerge-ts >= 8`, manteniendo ambos paquetes Prisma alineados.

Referencias:

- Multer 2.2/2.3 y advisories: https://github.com/expressjs/multer/blob/main/CHANGELOG.md
- Sharp 0.35: https://github.com/lovell/sharp/blob/main/docs/src/content/docs/changelog/v0.35.0.md
- Deepmerge advisory: https://github.com/advisories/GHSA-ggr8-5vv4-36mx
- Seguimiento Prisma: https://github.com/prisma/orm/issues/30052
- Migración Prisma 7: https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7

## Verificación final

- `npm test`: 29/29 PASS.
- `npx prisma validate`: PASS.
- `npx prisma generate`: PASS, cliente 6.19.3.
- `npm run test:integration`: PASS con 22 migraciones, seed y ocho smokes.
- Instalación limpia: `npm ci`, unit tests, validate, generate e integración PASS.
- `npm audit`: 3 high, todas correspondientes a la única cadena de tooling Prisma descrita arriba; 0 runtime conocidas, 0 critical.

No se cambiaron reglas de negocio, contratos públicos, schema, migraciones, Node, MySQL ni superficies web/landing/mobile.
