# PROMY — Tracker de remediación actual

> Reconciliado contra `origin/main` en `2b7c7b2607e88284dbcd5a395c5e40931ad9e951`. Los estados describen evidencia presente en el repositorio; una integración externa sólo se cierra con evidencia del entorno real.

## Estados y resumen

- **RESOLVED:** corrección y evidencia versionada en `main`.
- **EXTERNAL:** requiere configuración, decisión o evidencia fuera del repositorio.
- **DEFERRED:** mejora aceptada para trabajo incremental.
- **REQUIRES_VALIDATION:** tooling listo, ejercicio real pendiente.

La auditoría histórica registró **43** hallazgos: **40 RESOLVED**, **2 EXTERNAL** y **1 DEFERRED**. Los commits citados son ancestros de `origin/main` en este corte.

## Hallazgos históricos P1

| ID | Descripción | Estado | Evidencia actual |
|---|---|---|---|
| RED-001 | Cupo de canje no atómico | RESOLVED | `d136005`; regresiones de concurrencia |
| RED-002 | Canje tras retirar o expirar promoción | RESOLVED | `d136005`; estado actual validado |
| COM-001 | Reactivación de comercio inactivo por dueño | RESOLVED | `d136005`; transición administrativa separada |
| MOD-001 | Comercio oculto expuesto públicamente | RESOLVED | `d136005`; catálogo, mapa, detalle y canje cubiertos |
| MOD-002 | Caché exponía promoción retirada | RESOLVED | `d136005`; invalidación y relectura |
| AUTH-001 | Rotación refresh concurrente | RESOLVED | `50c8ef6`; una rotación ganadora |
| AUTH-002 | Bloqueo/logout conservaba acceso sensible | RESOLVED | `50c8ef6`; sesión activa y estado controlados |
| AUTH-003 | JWT SSE aceptado por API | RESOLVED | `50c8ef6`; audience/kind separados |
| PRIV-001 | Contacto de cliente expuesto a comercio | RESOLVED | `6faaa96`; DTO/CSV mínimos |
| OBS-001 | Sanitización insuficiente de logs/Sentry | RESOLVED | `6faaa96`; sanitizador central |
| CFG-001 | Entorno productivo podía caer en desarrollo | RESOLVED | `166c001`; fail-fast |
| SEC-001 | Proxy/rate limit inseguro | RESOLVED | `166c001`; proxy explícito; aislamiento real externo |
| OPS-001 | Staging/backup/alertas reales sin verificar | EXTERNAL | Block 19 (`3630ded`) prepara tooling; falta entorno real |

## Hallazgos históricos P2

| ID | Descripción | Estado | Evidencia actual |
|---|---|---|---|
| API-001 | Errores de cliente respondían 500 | RESOLVED | `b61f884`; mapeos 400/409/413/415 |
| API-002 | Conflictos concurrentes respondían 500 | RESOLVED | `b61f884`; contrato idempotente/conflicto |
| DOM-001 | Horarios cruzando medianoche | RESOLVED | `b61f884`; fronteras cubiertas |
| CAT-001 | Paginación filtraba después de `take` | RESOLVED | `b61f884`; elegibilidad y `hasMore` |
| SEC-002 | HTML no escapado en email | RESOLVED | `634f402`; prueba de provider |
| SEC-003 | Política bcrypt mayor a 72 bytes | RESOLVED | `634f402`, `ba251bc`; límite UTF-8 |
| SEC-004 | Fórmulas en CSV | RESOLVED | `634f402`; neutralización de prefijos |
| UPL-001 | Colisión de nombres de upload | RESOLVED | `634f402`; UUID v4 |
| UPL-002 | Lifecycle y límites de uploads | RESOLVED | `5101ab3`; fake/local; R2 real externo |
| PRIV-002 | Baja borraba canjes históricos | RESOLVED | `5101ab3`; preservación de métricas |
| PRIV-003 | Retención y responsable legal sin cierre | EXTERNAL | Copy/código alineados; faltan decisiones y revisión jurídica |
| CACHE-001 | Invalidación Redis por SCAN | RESOLVED | `520a9cb`; harness Redis 7.4 |
| CACHE-002 | Redis caído no degradaba con deadline | RESOLVED | `520a9cb`, `1a2e5d2`; fallback y recuperación |
| DB-001 | Consulta geo no usaba índice | RESOLVED | `7f29f74`; harness MySQL 8.4 |
| PERF-001 | Listados sin paginación integral | RESOLVED | `251fed8`, `1d9e135`, `a008352`, `0726314` |
| NET-001 | Timeouts/reintentos incompletos | RESOLVED | `251fed8`; política GET/POST |
| MOB-001 | Configuración Expo no inlineable | RESOLVED | `251fed8`, `87e048b`; gate de bundle |
| MOB-002 | Carreras de sesión Mobile | RESOLVED | `923404d`; QA físico externo |
| MOB-003 | Permiso de ubicación | RESOLVED | `923404d`; QA físico externo |
| UX-001 | Overflow responsive Web | RESOLVED | `75ae954`; regresión CSS/DOM |
| UX-002 | Labels, foco y live regions | RESOLVED | `75ae954`; no es certificación WCAG |
| UX-003 | Mojibake Landing | RESOLVED | `a0154f0`; detector incluido |
| UX-004 | Promesas públicas no acreditadas | RESOLVED | `a0154f0`; copy pre-piloto |
| UX-005 | Métricas administrativas ambiguas | RESOLVED | `75ae954`; semántica corregida |
| DEP-001 | Advisories de dependencias | RESOLVED | `c1ac455`; triage sin upgrades forzados |
| QA-001 | CI sin cobertura de invariantes | RESOLVED | `62d034c`, `87e048b` y gates posteriores |
| REL-001 | Artifacts no ligados al SHA | RESOLVED | `62d034c`, `87e048b`; manifest/checksums |
| OPS-002 | Shutdown sin límite/terminación segura | RESOLVED | `cf44625`; readiness, drain y harness |

## Hallazgos históricos P3

| ID | Descripción | Estado | Evidencia actual |
|---|---|---|---|
| CACHE-003 | Cache en memoria sin límite/limpieza | RESOLVED | `7f29f74`; LRU, TTL y cleanup |
| ARCH-001 | Tipos/reglas duplicados y módulos grandes | DEFERRED | Refactor incremental; no reescritura |

## Gates operativos suplementarios (fuera del conteo de 43)

Los 11 registros de esta sección son seguimiento operativo, no hallazgos históricos adicionales. Incluyen 9 `EXTERNAL` y 2 `REQUIRES_VALIDATION`; no alteran el total histórico de 43 ni su distribución de 40 `RESOLVED`, 2 `EXTERNAL`, 1 `DEFERRED` y 0 `OPEN`. No pasan a `RESOLVED` por la existencia de un script, fake o CI.

| Gate | Estado | Base implementada | Falta para cerrar |
|---|---|---|---|
| Staging aislado | EXTERNAL | Block 19 y runbooks | Ambiente, deploy y smoke real |
| DNS/TLS/proxy/origin | EXTERNAL | Política `TRUST_PROXY` y runbook | Infraestructura verificada |
| Backup off-site y restore | REQUIRES_VALIDATION | Wrappers backup/restore/verify | Ejercicio real aislado |
| Rollback por SHA | REQUIRES_VALIDATION | `rollback-check.mjs` y runbook | Ejecución con artifacts aprobados |
| Alertas/Sentry | EXTERNAL | Sanitización y guía de evidencia | Proyecto, alerta y ejercicio real |
| Resend/email | EXTERNAL | Provider y tests sin tráfico externo | Identidad y envío QA real |
| R2/S3 | EXTERNAL | Adapter, lifecycle y fake | Bucket/credenciales y smoke real |
| QA físico Android | EXTERNAL | Export y gates Expo | Dispositivo, red, cámara, GPS y sesión |
| QA físico iOS | EXTERNAL | Código/checks estáticos | Build, dispositivo y permisos reales |
| Branch protection | EXTERNAL | CI de PR a main | Reglas GitHub configuradas |
| Landing public release | EXTERNAL | Validación estricta de release | URLs y datos jurídicos definitivos |

## Criterio operativo

Para cerrar una validación real registrar entorno, SHA, fecha, operador, resultado y evidencia externa segura, sin secretos ni PII.

- [Handoff actual](PROMY_HANDOFF.md)
- [Runbooks de operaciones](operations/)
- [Mega Audit histórica](audits/2026-09-10/README.md)
