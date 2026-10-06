# PROMY — Mega auditoría integral

Trabajo ejecutado: 10 de septiembre de 2026. Consolidación y cierre: 11 de septiembre de 2026, America/Montevideo. Repositorio: `C:\PROMY`. Base auditada: `main`, commit `d61c54a9a33cf4599c80af05ed1ba825c7d954a1`. El informe describe ese commit, no futuras correcciones.

## 1. Resumen ejecutivo

**Veredicto global: C — MVP funcional que requiere resolver bloqueantes antes de un piloto externo. Listo para piloto: NO.**

**Vale la pena continuar sobre esta base.** Hay cuatro aplicaciones reales, persistencia relacional, moderación, canje con validación por comercio, autenticación con sesiones y una integración reproducible. No se justifica reconstruir PROMY. Sí hacen falta correcciones focalizadas en invariantes de negocio, autorización, contratos y operación.

No confirmé un P0. Confirmé fallos P1 que afectan la promesa central: un cupo de un canje terminó con ocho canjes exitosos al validar códigos diferentes concurrentemente; promociones rechazadas, ocultas o expiradas todavía aceptaron códigos pendientes; un comercio inactivado pudo reactivarse; ocultar un comercio no lo eliminó consistentemente del descubrimiento. La caché también puede seguir exponiendo una promoción que volvió a revisión.

La autenticación tiene controles útiles, pero la rotación de refresh no es atómica: diez solicitudes simultáneas obtuvieron diez refresh nuevos. Bloquear un ADMIN no revoca su access token. Un JWT emitido para SSE se acepta como Bearer de la API ADMIN. No encontré evidencia de explotación real ni de acceso a producción; todos los resultados provienen de cuentas sintéticas y servidores locales aislados.

El baseline técnico es mejor que lo que sugería parte del contexto histórico: API 29/29 unit tests, integración completa, Web y Landing compilando, Mobile alineado con Expo, doctor 18/18 y export Android exitoso. El CI remoto del mismo HEAD está verde en sus cinco jobs, incluido MySQL 8.4/Linux. Esto demuestra reproducibilidad del baseline, no ausencia de errores: las nuevas pruebas detectaron casos que esa suite no cubre.

La revisión visual real encontró una identidad reconocible y buenos paneles de escritorio, pero overflow a 320–430 px, formularios sin nombres accesibles asociados y mojibake visible en Landing. Commerce expone email y teléfono de clientes mientras la política publicada afirma que no los comparte. La eliminación de cuenta borra canjes exitosos y altera métricas/cupos históricos.

La carga local, con 1.000 comercios y 5.000 promociones sintéticas adicionales, pasó hasta 250 solicitudes simultáneas. A 500, una corrida tuvo 18 errores de transporte y la repetición pasó; no hay capacidad productiva certificada. El EXPLAIN geográfico eligió recorrido completo de tabla y filesort. Redis existe, pero su invalidación por prefijo es incorrecta con la versión instalada y su fallback no responde oportunamente cuando el servidor está caído.

Recomendación: mantener el monolito modular y las cuatro aplicaciones; cerrar los P1 de dominio/auth/privacidad, establecer staging y operación básica, ejecutar QA físico Mobile, y recién entonces un piloto asistido en Concordia. Evitar microservicios, reescritura de UI y upgrades masivos antes de recuperar estos invariantes.

## 2. Método, alcance y límites

Se contrastaron las 94 secciones del Contexto Maestro con las 257 instrucciones del mega prompt. Sus matrices completas están en [trazabilidad del alcance](C:/PROMY/audit/2026-09-10/COBERTURA_257.md) y [contraste histórico](C:/PROMY/audit/2026-09-10/CONTRASTE_94.md). Una instrucción cubierta puede terminar en «no verificado»; no equivale a una prueba aprobada.

Estados usados:

| Estado | Significado |
|---|---|
| E | Ejecutado: comando, petición, prueba, medición o interacción real. |
| I | Inspeccionado: evidencia en código/configuración/historial, sin reproducir todo el comportamiento. |
| INF | Inferido: consecuencia o recomendación fundamentada, todavía no medida. |
| NV | No verificado: faltan entorno, dispositivo, servicio externo o prueba específica. |

La copia de trabajo se obtuvo de `git archive HEAD`, sin modificar funcionalidades del repositorio. Se instalaron dependencias y generaron builds solamente en `.audit-mega-2026-09-10/source`. La base original de XAMPP en 3306 no se utilizó para pruebas. Se creó una instancia separada MariaDB 10.4.32, datadir exclusivo de auditoría, bind `127.0.0.1`, puerto 3327 y schema `promy_meg_audit_test`; se verificaron puerto, nombre y datadir antes del trabajo destructivo. API en 4027, Web 5187 y Landing 5188, exclusivamente loopback. No se enviaron emails, push ni uploads a proveedores externos.

Host: Windows 10.0.26200, AMD Ryzen 3 7320U, 8 procesadores lógicos, aproximadamente 14.157 MiB de RAM, Node 22.18.0 y npm 10.9.3. CI usa Node 22.22.0. No se midieron IOPS, consumo energético ni latencia WAN. Algunas ejecuciones iniciales fallaron por restricciones de sandbox —EPERM al crear procesos y bloqueo de red—; las repeticiones autorizadas fuera de ese sandbox quedaron registradas. Eso no se atribuye al producto.

No hubo revisión física Android/iOS, distribución firmada, TestFlight/Play, diagnóstico nativo de cámara/GPS/SecureStore/push, certificados TLS reales, proxy desplegado, DNS, proveedores de email/storage/observabilidad ni datos reales. Tampoco se hizo pentest exhaustivo, auditoría jurídica certificada, comparación visual pixel a pixel con Figma, Lighthouse móvil controlado ni certificación WCAG. Los archivos fueron inventariados y se inspeccionaron rutas críticas; **no se afirma revisión manual línea por línea de todos los blobs**, dependencias transitivas o archivos binarios.

## 3. Inventario real y Git

| Componente | Evidencia y estado |
|---|---|
| API | 136 archivos tracked; Express 5, TypeScript, Prisma 6.19.3, MySQL, Zod, bcrypt/JWT, Sharp, S3, Resend, Sentry y caché Redis opcional. |
| Web | 60 archivos; React 19, React Router, Vite 7.3.6, ADMIN y COMMERCE en una SPA con chunks por panel. |
| Landing | 19 archivos; React/Vite, SEO en HTML, formulario beta y métricas públicas. |
| Mobile | 86 archivos; Expo 54.0.37, React Native 0.81.5, Reanimated 4.1.7, Worklets 0.5.1, React Navigation, SecureStore. CLIENT y COMMERCE siguen siendo rutas reales. |
| DB | 12 modelos de negocio, 22 migraciones, tabla de migraciones, índices BTREE/FULLTEXT/SPATIAL y dos triggers de coordenadas. |
| Release | 517 archivos tracked: 509 archivos dentro de copias y 8 ZIP. `verify` contiene sólo 14 migraciones API; `hardened`, 22. No son fuentes equivalentes al HEAD. |
| Diseño/documentos | 29 archivos design-import; README, guías operativas y documento previo de reactivación. No hay evidencia de ADR formal ni manual de incidentes completo. |
| Git | 858 archivos tracked, 14 commits alcanzables, sin gitlinks; un repositorio raíz, cuatro package-lock v3. `main` local coincidió con remoto al consultar. No push, commit, reset ni cambio de rama. |

El [inventario íntegro](C:/PROMY/audit/2026-09-10/evidence/inventory.json) contiene rutas, tamaños, líneas, hashes, manifiestos, lockfiles, declaraciones de endpoints y variables encontradas. [Revisión de Git/release](C:/PROMY/audit/2026-09-10/evidence/repository-checks.json) documenta diferencias de copias y escaneo de firmas de secretos en los 14 commits. No aparecieron claves privadas/tokens con las firmas buscadas; **no prueba ausencia absoluta de secretos**. No se volcaron los `.env` privados ni se verificó vigencia de credenciales contra proveedores.

Los ocho ZIP no contienen entradas `.env`; eso incluye la ausencia de `.env.example`. El empaquetador excluye `.env.*`, copia fuentes del workspace, omite CI/documentación raíz y no vincula el artefacto a un commit inmutable. Su dry-run pasó; no se generó una release nueva ni se eliminaron archivos legado. El directorio release crea duplicación y riesgo de desplegar código viejo. Recomendación: una fuente canónica en raíz y artefactos versionados generados por CI, con SHA y manifiesto, conservando el histórico fuera de las rutas de desarrollo.

## 4. Tabla maestra de hallazgos

P0: bloquea inmediatamente por impacto crítico demostrado. P1: corregir antes del piloto externo o satisfacer la condición explícita de despliegue. P2: corregir pronto. P3: mejora. Complejidad: S ≤1 día, M 2–4 días, L 5–10 días orientativos de ingeniería; no son presupuesto ni suma de calendario. E/I se indican en evidencia. Los hallazgos transversales tienen un único ID.

| ID | Área | Severidad | Hallazgo | Evidencia | Impacto | Solución propuesta | Complejidad |
|---|---|---|---|---|---|---|---|
| RED-001 | Canjes | P1 | Cupo no atómico entre códigos diferentes: 8 éxitos con máximo 1. | E `runtime-probes.json`, cap concurrente; [servicio](C:/PROMY/promy-api/src/modules/redemptions/redemptions.service.ts:509). | Beneficios por encima de lo comprometido. | Bloquear/actualizar atómicamente el cupo por promoción en la misma transacción de validación; repetir carrera. | M |
| RED-002 | Canjes/moderación | P1 | Código pendiente valida después de expirar/rechazar/ocultar promoción. | E tres HTTP 200; [validación](C:/PROMY/promy-api/src/modules/redemptions/redemptions.service.ts:455). | Se consumen beneficios retirados; contradice vigencia prometida. | Revalidar estado, visibilidad, comercio, fechas/ventanas al confirmar; definir explícitamente cualquier gracia. | M |
| COM-001 | Commerce | P1 | INACTIVE puede volver a APPROVED mediante endpoint del dueño. | E PATCH 200; [transición](C:/PROMY/promy-api/src/modules/commerce/commerce.service.ts:721). | La suspensión administrativa comparte transición con pausa propia. | Separar suspensión de pausa y exigir autorización administrativa para levantarla. | M |
| MOD-001 | Descubrimiento | P1 | Comercio oculto sigue en detalle, búsqueda y creación de canje. | E 200/201 y búsqueda; [filtro sobrescrito](C:/PROMY/promy-api/src/modules/promotions/promotions.service.ts:191). | Moderación inconsistente entre catálogo/mapa/canje. | Componer un único predicado público sin sobrescribir relación commerce; probar todos los endpoints. | M |
| MOD-002 | Caché/moderación | P1 | Promoción editada y en PENDING_REVIEW sigue en featured hasta TTL. | E caché calentada y DB contrastada; [featured](C:/PROMY/promy-api/src/modules/promotions/promotions.service.ts:242). | Ventana de publicación de contenido retirado. | Invalidar todas las mutaciones relevantes y revalidar estado al servir datos sensibles. | M |
| AUTH-001 | Sesiones | P1 | Un refresh usado en 10 solicitudes concurrentes rota 10 veces. | E 10 HTTP 200/tokens distintos; [rotación](C:/PROMY/promy-api/src/modules/auth/auth.service.ts:699). | Reutilización aceptada, último token gana y carreras pueden invalidar sesión legítima. | CAS o transacción con bloqueo y política explícita de reuse; pruebas cross-tab/dispositivo. | M |
| AUTH-002 | RBAC | P1 | Bloqueo de ADMIN no revoca access token; logout tampoco. | E dashboard 200 y users/me 200; [middleware](C:/PROMY/promy-api/src/middlewares/auth.middleware.ts:31). | Privilegios retenidos hasta expirar JWT; claims/sessionVersion no se consultan. | Comprobar estado y versión/sesión para rutas sensibles, definir SLA de revocación. | M |
| AUTH-003 | SSE/JWT | P1 | Token SSE aceptado como access token ADMIN. | E `realtime.json`; [JWT](C:/PROMY/promy-api/src/shared/utils/jwt.ts:75). | Token pensado para URL/canal adquiere alcance API durante su vigencia. | Separar audience/kind y validar payload; idealmente clave/issuer apropiados para cada tipo. | S |
| SEC-001 | Proxy/rate limits | P1 condicional | X-Forwarded-For falsificado elude límite cuando el origin es accesible directamente. | E IP fija llega a 429, IP variable no; [app](C:/PROMY/promy-api/src/app.ts:15). | Fuerza bruta y abuso si la topología confía headers del cliente. | Aislar origin, proxy que sobrescriba headers, configurar confianza por topología probada. | S–M |
| CFG-001 | Entornos | P1 condicional | NODE_ENV=production sin APP_ENV activa development; secretos JWT del ejemplo aceptados en production. | E `operational.json`; [env](C:/PROMY/promy-api/src/config/env.ts:41). | Deploy mal configurado puede conservar preview de tokens, secretos conocidos y CORS permisivo. | Fail-fast ante contradicción, secretos aleatorios obligatorios y gate de deploy. No hay evidencia de deploy vulnerable real. | S |
| PRIV-001 | Privacidad | P1 | Commerce recibe email/teléfono, contrario a política. | E payload y UI; [select](C:/PROMY/promy-api/src/modules/redemptions/redemptions.service.ts:99), [política](C:/PROMY/promy-web/src/features/public/legalContent.ts:96). | Exposición innecesaria y promesa falsa al cliente. | Minimizar DTO/CSV y alinear información/consentimientos; justificar cualquier dato imprescindible. | S–M |
| API-001 | Inputs/errores | P2 | JSON malformado, >1 MB, null, longitud excesiva y errores de upload terminan en 500. | E runtime/supplementary; [handler](C:/PROMY/promy-api/src/middlewares/errorHandler.ts:6). | Errores de cliente contaminan alertas y contrato; parser previo a requestId. | Mapear parser/Multer/Prisma/Zod a 400/413/415/409 y límites coherentes con DB. | M |
| API-002 | Idempotencia | P2 | Alta y creación de canje concurrentes: 1 éxito y 9 errores 500. | E una fila en DB por unique. | Reintentos del usuario parecen caída; no es duplicación de filas. | Traducir conflictos únicos y ofrecer resultado idempotente donde corresponda. | S–M |
| DOM-001 | Horarios | P2 | Franja lunes 22–02 acepta lunes 01 y rechaza martes 01. | E función real; [horario](C:/PROMY/promy-api/src/shared/utils/promotionStatus.ts:154). | Disponibilidad incorrecta en promociones nocturnas. | Anclar cruce de medianoche al día de inicio y cubrir fronteras. | M |
| CAT-001 | Paginación | P2 | Filtrado horario posterior a take devuelve lista vacía/hasMore=false con promos válidas posteriores. | E `supplementary.json`; [catálogo](C:/PROMY/promy-api/src/modules/promotions/promotions.service.ts:219). | Feed parece sin oferta y no permite llegar a resultados existentes. | Paginar sobre conjunto elegible o continuar buscando antes de decidir hasMore. | M |
| SEC-002 | Email | P2 | Nombre con HTML llega sin escape a templates. | E proveedor interceptado, sin envío; [template](C:/PROMY/promy-api/src/modules/auth/auth.service.ts:189). | Inserción de enlaces/textos engañosos en email propio del producto. No se probó ejecución JavaScript en clientes de correo. | Escape contextual de texto interpolado, pruebas HTML. | S |
| SEC-003 | Contraseñas | P2 | Sin límite en bytes antes de bcrypt; sufijos después de 72 bytes equivalen. | E bcrypt real; [schema](C:/PROMY/promy-api/src/modules/auth/auth.service.ts:22). | Política de contraseña no coincide con secreto efectivamente usado. | Política consciente de bytes o esquema de prehash/versionado revisado; no migrar hashes sin compatibilidad. | M |
| SEC-004 | CSV | P2 | Escape CSV no neutraliza fórmulas. | E función produce `"=1+1"`; [exportador](C:/PROMY/promy-web/src/features/commerce/CommerceRedemptionsHistoryTable.tsx:5). | Datos de usuario pueden interpretarse como fórmula al abrir CSV. No se ejecutó Excel ni payload destructivo. | Neutralizar prefijos de fórmula conservando formato CSV y probar consumidores. | S |
| UPL-001 | Uploads | P2 | Filename Date.now + base colisiona; 1.000 llamadas produjeron 6 nombres. | E función; [nombre](C:/PROMY/promy-api/src/shared/services/uploads.service.ts:45). | Reemplazo accidental bajo concurrencia para nombres iguales; no se demostró overwrite HTTP entre usuarios. | UUID/aleatoriedad, no clobber; prueba storage concurrente. | S |
| UPL-002 | Storage | P2 | Sin lifecycle de imágenes huérfanas y sin presupuesto explícito de píxeles/concurrencia. | I [uploads](C:/PROMY/promy-api/src/shared/services/uploads.service.ts:57). | Costos/memoria y objetos que sobreviven a reemplazos/bajas. | Límites de píxeles/partes, job de huérfanos con período de gracia y métricas; no se generó image bomb. | M |
| PRIV-002 | Bajas/analítica | P2 | Eliminar CLIENT borra canjes SUCCESS en cascada. | E count 1→0; [baja](C:/PROMY/promy-api/src/modules/users/users.service.ts:730), schema. | Pierde trazabilidad y reduce numerador de cupos/estadísticas; recreación puede reutilizar beneficio. | Anonimizar o conservar agregado no identificable con política y cupos inmutables. | M–L |
| PRIV-003 | Legal/retención | P2 | Política declara retenciones y responsable que no están operativizados/verificados. | I legalContent: 30 días, logs 12 meses, dirección sólo ciudad; NV responsable real. | Respuestas a derechos y responsabilidades ambiguas. | Identificar responsable/contacto, proceso de derechos, retención ejecutable y revisión jurídica local. | M |
| OBS-001 | Logs/Sentry | P1 antes de telemetría real | Redacción por clave no limpia Error.message/stack ni originalUrl con tokens. | E token sintético sobrevive; [logger](C:/PROMY/promy-api/src/shared/logging/logger.ts:44), errorHandler/Sentry. | Credenciales de URL y payload de errores podrían salir a logs/telemetría. | Sanitizar URL, strings/errores y Sentry antes de salida; conservar diagnóstico seguro. | M |
| CACHE-001 | Redis | P2; gate si se habilita | scanIterator de Redis 5 entrega arrays; String(array) arma una clave concatenada. | E stub de contrato + dependencia instalada, `failures.json`; [caché](C:/PROMY/promy-api/src/shared/cache/ttlCache.ts:55). | deleteByPrefix/clear no invalidan varias claves. | Aplanar batches correctamente, integración Redis real. | S |
| CACHE-002 | Resiliencia | P2; gate si se habilita | Redis caído deja get pendiente >4 s en lugar de fallback inmediato. | E loopback sin servidor; [connect](C:/PROMY/promy-api/src/shared/cache/ttlCache.ts:82). | Endpoint acoplado a reconexión sin límite de aplicación. | Timeout/reconnect acotado/circuit breaker, probar caída y recuperación. | M |
| CACHE-003 | Memoria | P3 | TTL Map elimina expirados sólo cuando se leen; sin máximo de claves. | I ttlCache MemoryTtlStore. | Crecimiento si se agregan claves de alta cardinalidad; magnitud actual no medida. | LRU/límite y barrido simple; no sobredimensionar caché. | S |
| DB-001 | Geo | P2 | Índice espacial existe pero query no lo aprovecha en plan medido. | E EXPLAIN ALL ~1.005 filas/filesort; [consulta](C:/PROMY/promy-api/src/shared/services/spatial.service.ts:39). | Costo geográfico crece con comercios; índice existente no basta. | Predicado indexable/índice adecuado según EXPLAIN en MySQL target; benchmark representativo. | M |
| PERF-001 | Listados | P2 | Historiales/gestión sin paginación integral; algunas pantallas cortan a un take fijo. | I services redemptions/commerce/admin/notifications. | Crece payload/memoria y listas administrativas pierden exhaustividad. | Cursor/paginación server-side, total/hasMore real y conteos separados. | M |
| NET-001 | Red/servicios | P2 | Web y Resend sin timeout explícito; Mobile limita fetch hasta headers, no lectura del body; fallback puede repetir POST. | I [Mobile](C:/PROMY/promy-mobile/src/api/client.ts:42), email.service. | Esperas indefinidas y efectos repetidos ante respuesta perdida. | Deadline end-to-end, retry sólo seguro/idempotente, política de error consistente. | M |
| MOB-001 | Config Mobile | P2 | EXPO_PUBLIC_API_URLS/HOSTS usan acceso dinámico no inlineable. | I [base](C:/PROMY/promy-mobile/src/api/base.ts:21) + documentación Expo. | Lista de hosts puede funcionar en tooling pero faltar en bundle; URL singular funciona. | Referencias estáticas y test del bundle final por perfil. | S |
| MOB-002 | Auth Mobile | P2 | Refresh pendiente puede persistir después de signOut; bootstrap con 401+offline termina borrando sesión. | I [AuthContext](C:/PROMY/promy-mobile/src/context/AuthContext.tsx:90); carrera nativa NV. | Reaparición/pérdida de sesión y experiencia offline inconsistente. | Epoch/generation guard, cancelación lógica y prueba de hooks + dispositivo. | M |
| MOB-003 | Permisos | P2 | «Ahora no» en explicación de ubicación resuelve igual que continuar. | I [Home](C:/PROMY/promy-mobile/src/screens/main/HomeScreen.tsx:125). | Decisión de usuario no controla solicitud posterior; UX física NV. | Retornar intención y respetar cancelación antes del permiso del SO. | S |
| UX-001 | Responsive | P2 | Overflow documental en ADMIN/Commerce 320–430 px. | E 45 combinaciones ruta/ancho, `ui-observations.json`. | Uso en caja/teléfono requiere desplazamiento lateral y recorta acciones. | Revisar grids/min-width y aislar scroll sólo en tabla; repetir matriz. | M |
| UX-002 | Accesibilidad | P2 | Labels visuales sin asociación; mensajes sin live region en recuperación. | E 12 inputs perfil, 14 editor sin labels/aria asociados. | Formularios difíciles para lector de pantalla; feedback no anunciado. | htmlFor/id, nombre accesible, foco/error summary/aria-live y QA teclado. | M |
| UX-003 | Landing | P2 | Mojibake visible en copy/FAQ. | E navegador + I fuente Landing. | Daña comprensión y confianza antes de registro. | Corregir encoding de origen y gate de caracteres corruptos en contenido. | S |
| UX-004 | Confianza | P2 | Testimonios sin evidencia editorial, enlaces sociales genéricos y promesas no verificadas. | E Landing/I App.tsx; autenticidad de testimonios NV. | Producto aparenta validación/disponibilidad que no puede acreditarse. | Quitar o identificar ejemplos y publicar sólo testimonios consentidos/enlaces reales. | S |
| UX-005 | Dashboard | P2 | «Top categorías» muestra comercios; cobertura usa sólo recientes. | E UI/I [dashboard](C:/PROMY/promy-web/src/features/admin/AdminDashboardPage.tsx:181). | ADMIN interpreta métricas equivocadas. | Etiqueta correcta o agregación real; definir denominadores/ventanas y frescura. | S–M |
| DEP-001 | Dependencias | P2 | npm audit: API 3 high; Mobile 24 (9 high/15 moderate). | E logs audit, sin explotación demostrada. | Riesgo residual de tooling y dependencias runtime. | Triage por alcanzabilidad, actualizaciones compatibles y aceptación temporal explícita; no audit fix --force. | M |
| QA-001 | Tests/CI | P2 | Suite verde no cubre invariantes hallados; harness Web/Mobile no está en CI. | E baseline + I workflow. | Regresión silenciosa tras corrección; cobertura porcentual no configurada/medida. | Incorporar casos de esta auditoría y harness existentes como gates. | M |
| REL-001 | Release | P2 | Copias/ZIP desfasados y artefactos sin vínculo inequívoco a HEAD. | E inventario ZIP/dry-run. | Desplegar versión incorrecta; documentación/config ejemplo ausente del bundle. | Artefactos CI por SHA, manifiesto y procedimiento de rollback. | M |
| OPS-001 | Operación | P1 de readiness, no exploit | Staging/proxy/backup externo/alertas/servicios reales sin verificación operativa. | I docs y repositorio; NV entornos externos. | Piloto sin garantías de recuperación, contacto y diagnóstico. | Completar gates de sección 16 y evidencia en staging. | L |
| OPS-002 | Lifecycle servidor | P2 | Shutdown depende de cierre de conexiones; sin deadline; uncaughtException se registra sin terminar proceso. | I [server](C:/PROMY/promy-api/src/server.ts:29). | SSE puede impedir cierre y proceso puede continuar en estado incierto. | Drain con plazo, cierre SSE/Redis/DB, política de crash/restart y flush Sentry. | M |
| ARCH-001 | Contratos/código | P3 | Tipos/constantes/reglas repetidos entre apps; servicios/pantallas grandes. | I inventario/topSourceFiles y tipos API. | Drift y costo de cambio; no demuestra código muerto por sí solo. | Extraer contratos versionados y módulos por regla sólo al tocarla; evitar monorepo/refactor masivo como requisito. | L incremental |

Los P1 condicionales no afirman exposición productiva actual. Se pueden cerrar demostrando el gate de despliegue apropiado; los P1 reproducidos de negocio/auth requieren corrección, no una aceptación de riesgo genérica.

## 5. Arquitectura, API y modelo de datos

El diseño actual es un monolito modular razonable para el piloto: routers, controllers, servicios por dominio, Prisma y utilidades compartidas. Web separa áreas por rol; Mobile reutiliza API, con contratos TypeScript locales. No hay BFF separado, colas durables, microservicios ni event sourcing; no son necesarios para validar la propuesta.

API monta `/api/health`, `/readiness`, `/auth`, `/users`, `/cities`, `/categories`, `/commerces`, `/promotions`, `/commerce`, `/admin`, `/redemptions`, `/uploads`, `/notifications`, `/map`, `/search`, `/realtime`, `/beta` y `/stats`. Las declaraciones/rutas y middleware están inventariadas; no se ejecutó cada combinación de endpoint, rol e input. `/api` no es versionado semánticamente y no encontré un contrato OpenAPI usado como gate. Los clientes confían en casts de respuestas; faltan pruebas de compatibilidad para versiones Mobile ya distribuidas. Recomendación: primero snapshots/contratos y cambios aditivos; introducir v2 sólo para rupturas necesarias.

Se verificaron 401 anónimo, 403 por rol incorrecto y 404 al editar la promoción de otro dueño. Eso no compensa AUTH-002/003. IDs enteros autoincrementales son aceptables con autorización de objeto; ocultar IDs no soluciona IDOR. Los QR usan códigos, no deben conferir permiso de administración. El servidor tiene ownership en validación. No se demostró SQL injection: Prisma y SQL raw inspeccionado usan parámetros. Una búsqueda con comilla devolvió 200 sin romper SQL; no es una prueba exhaustiva de inyección.

La DB tiene relaciones User–Session, owner único por Commerce, City/Category, Promotion–Schedule, Redemption única por usuario/promoción y código, notificaciones/push, beta y bitácora administrativa. Las claves únicas evitaron duplicados incluso cuando la API devolvió 500. FK y cascadas son consistentes técnicamente; la semántica de borrado requiere PRIV-002. La regla única usuario/promoción significa un único registro reutilizable, no un libro contable de múltiples usos: cualquier modelo de promociones recurrentes necesitará definición explícita antes de modificarla.

Hay índices relevantes por estado/ciudad/categoría, usuario/fecha y vencimientos. Session tiene índice `(userId,expiresAt)`, pero no un proceso global periódico de purga; clientes inactivos acumularán sesiones vencidas. AdminActionLog no es inmutable frente a borrado del usuario ADMIN por cascada de esquema; no existe endpoint demostrado para esa eliminación. Las estadísticas de redenciones viven sobre registros mutables y no son contabilidad financiera.

FULLTEXT: las migraciones crean índices individuales en columnas buscadas. En el entorno aislado se comprobó presencia de índices y uso FULLTEXT en `MATCH(title) AGAINST(...)`. Esto no certifica que todas las consultas OR/relevance de Prisma usen ese plan ni la calidad de búsqueda española (tildes, palabras cortas, stopwords, sinónimos). El fallback a contains aporta continuidad pero puede disimular degradación y aumentar costo. El CI MySQL 8.4 y la integración local pasaron; el incidente histórico no debe declararse todavía activo como caída reproducida.

Geolocalización: POINT, triggers, bounding box y `ST_Distance_Sphere` existen realmente. Se probaron ±90/±180, cero, Infinity y longitud 181; los dos últimos se rechazaron 400. Coordenadas vacías se coercionaron y respondieron 200: es ambigüedad de input, no ubicación válida aportada conscientemente. El sentinel de ubicaciones ausentes y el filtro IS NOT NULL requieren mantenerse juntos. Antimeridiano, polos con radio, DST internacional y precisión física GPS siguen NV. El piloto Concordia no necesita geografía mundial, pero sí ubicación denegada y coordenadas corregibles.

El descuento usa Float: suficiente para representación aproximada de porcentajes, pero no adoptarlo como ledger de dinero. Moneda local/copy ARS debe ser explícita; no hay pagos/cobros/liquidaciones implementados ni auditados. Categorías y ciudades activas facilitan moderación; se debe probar desactivar una categoría con comercios existentes y definir visibilidad, no borrar catálogos referenciados sin política.

## 6. Auditoría funcional y escenarios

| Flujo | Estado observado | Falta o riesgo |
|---|---|---|
| Cliente nuevo → registro/verificación/login | E integración y proveedor test. | Entrega real de email y enlaces en dispositivos NV; sin guard de edad efectivo demostrado. |
| Recuperación de cuenta | E integración y UI; email inexistente recibe mensaje genérico. | No se midió enumeración por tiempos; registro puede revelar email existente como decisión de UX/abuso. |
| Cliente recurrente → catálogo/búsqueda/mapa | E HTTP; I Mobile. | CAT-001, MOD-001, ubicación denegada/física NV. |
| Generar canje → Commerce valida | E happy path e integración; E canje inválido muestra error claro en UI. | RED-001/002 bloquean confianza del loop. |
| Mismo código repetido | E 2/10/100 solicitudes: exactamente un SUCCESS. | No extrapolar esa garantía al cupo entre códigos diferentes. |
| Commerce nuevo | E onboarding API e integración; perfil y checklist I/E UI. | El checklist considera existencia de imagen, no prueba que URL cargue. |
| Rechazo/edición de promo | E lifecycle/estado y UI badges. | Caché y validación no siguen todas las decisiones. |
| Promo vencida | E sweep/integración y UI estado. | Validación de pendiente todavía permite SUCCESS; DOM-001 en noche. |
| Comercio suspendido | E transición negativa reproducida. | Debe separar pausa del dueño de suspensión administrativa. |
| API lenta/caída | E carga; E DB caída con readiness 503; I mensajes/timeout. | No hubo emulación de red celular ni offline físico. |
| Sin ubicación/sin oferta | I estados Mobile y alternativas. | No se certificó UX nativa; horario/paginación puede crear falso vacío. |
| Borrar cuenta | E integración y cascada en base sintética; I UX legal. | Retención/anónimos/favoritos locales y recuperación de estadísticas. |
| Beta Landing → ADMIN | I endpoint/modelo/formulario; E pantallas y baseline. | No se envió solicitud real ni se verificó proceso humano de invitación. |
| Notificaciones/push | I persistencia, lectura y adaptador Expo; integración genera notificaciones locales. | Entrega push real NV; unreadCount limitado a últimas 50. |

Promociones soporta descuento, monto fijo, beneficio, franja, día y combo, con borrador/revisión/aprobación/rechazo/expiración, condiciones y cupo. La maquinaria existe. Faltan invariantes únicas aplicadas por todos los consumidores: «visible», «canjeable», «con cupo» y «comercio habilitado» no pueden ser definiciones distintas en Mobile, featured, mapa y validador. No conviene corregir cada pantalla por separado.

Favoritos son snapshots locales en AsyncStorage, separados por usuario. No hay modelo Favorites ni sincronización servidor/dispositivos; no deben venderse como persistencia en la cuenta. Revisar contenido obsoleto, logout/baja y fallback de promoción eliminada. Commerce analytics muestra actividad y CSV, pero no demuestra ventas incrementales, facturación ni retorno económico. ADMIN ofrece moderación y bitácora útiles; «incidencias» derivadas de estados de negocio no equivalen a monitoreo técnico.

## 7. Seguridad, auth, uploads y email

JWT access de 15 minutos, refresh de 7 días, hashes de refresh/fingerprint, sessionVersion, verificación de email, recuperación y claves de canje son buenas bases. Login utiliza comparación bcrypt también para usuario inexistente mediante hash dummy. La política exige 8 caracteres, mayúscula/minúscula/número, pero no máximo en bytes. No hay MFA ni separación granular de permisos entre ADMINs; añadir MFA para administración es una prioridad antes de ampliar operación, sin construir un IAM complejo.

En Web se observó refresh HttpOnly, SameSite=Lax en test, Path=/api/auth, sin refresh en JSON; producción configura Secure/SameSite más estricto por APP_ENV. Access en memoria y coordinación de refresh/StrictMode tienen harness que pasa. Mobile usa SecureStore en nativo y fallback Web controlado; la prueba usa mocks, no hardware. No se debe afirmar «SecureStore físicamente seguro» por ese harness.

CORS permitido/denegado/preflight pasó; las rutas Bearer no dependen de cookie para mutaciones normales. SameSite y origin checks reducen CSRF, pero la evaluación final requiere dominios reales, HTTPS y proxy; CORS no sustituye autenticación y permitir requests sin Origin es normal para clientes nativos. [Express documenta que la confianza en proxies debe coincidir con la topología y la sobrescritura de headers](https://expressjs.com/en/guide/behind-proxies/). El rate limiting actual es por proceso/IP: Redis de caché no lo vuelve distribuido. NAT compartido puede afectar usuarios honestos, mientras proxies mal configurados facilitan elusión. Evitar rate limiting global como único control de cuentas/comercios/códigos.

SSE usa token de cinco minutos en query, filtro por rol/owner y heartbeat de 20 segundos, con clientes en memoria. E: conexión entrega el primer evento 200 con identity y solicitando gzip; respondió sin compresión por `no-transform`. No se demostró fallo de buffering local. NV: proxy real y reconexión prolongada. La sesión SSE no revalida periódicamente usuario/suspensión ni cierra al vencer el JWT ya aceptado; no hay replay durable/Last-Event-ID. Antes de varias instancias necesita broadcast compartido y prueba de aislamiento entre comerciantes, no sólo sticky sessions.

Uploads: autenticación, límite 5 MB, allowlist MIME, comprobación de formato y recodificación WebP con Sharp funcionan parcialmente. PNG válido →201/WebP; magic incorrecta →400; PNG con sufijo script →201 recodificado a 68 bytes. No hubo evidencia de script conservado. MIME incorrecto/corrupto/exceso/dos archivos →500: error de contrato, no bypass exitoso de límite. Los 1.000 nombres generados con timestamp muestran colisión de función; no se exagera como overwrite cross-tenant HTTP demostrado. S3/R2 está implementado, no probado externamente; API no descarga las URLs arbitrarias inspeccionadas, por lo que no se afirma SSRF sin un sink servidor.

Resend tiene adaptador real y env fail-fast en production, proveedores console/test restringidos por entorno. Registro guarda estado antes de terminar email; fallos pueden dejar cuenta creada pendiente y exigir reenvío, que debe explicarse al usuario. No hay outbox durable/retry/backoff ni timeout explícito. SPF/DKIM/DMARC, dominio remitente, reputación, bounced/suppressed y enlaces reales NV. Para piloto, probar con buzones QA y métricas; no hace falta una plataforma de marketing.

Red team lite ejecutado: RBAC/ownership, input malformado/grande, carrera de registro/canje/refresh, repetición de código, evasión condicionada de rate limit, moderación y canje, scopes JWT, payload HTML de email interceptado, CSV no destructivo, uploads pequeños y variantes, búsqueda con comilla y límites de coordenadas. No se hizo fuzzing ilimitado, extracción real, fuerza bruta de usuarios reales ni DoS externo.

## 8. Web ADMIN, Web COMMERCE, Landing y accesibilidad

Se sirvieron builds de producción limpios, no capturas inventadas. ADMIN: dashboard, comercios con consola, categorías, promociones, solicitudes beta y auditoría. Commerce: dashboard, perfil/checklist, promociones/lista/editor, historial/validador. También login/logout y recuperación. Los datos visibles procedían de la API sintética. Se inspeccionaron desktop y cinco rutas en nueve anchos cada una, total 45 pares. No todas las pantallas se probaron en todos los anchos.

| Ancho CSS | Landing scrollWidth | ADMIN dashboard | ADMIN comercios | Commerce dashboard | Editor promo |
|---:|---:|---:|---:|---:|---:|
| 320 | 305 | 372 | 438 | 562 | 434 |
| 360 | 345 | 372 | 438 | 562 | 434 |
| 390 | 375 | 381 | 438 | 562 | 434 |
| 430 | 415 | 421 | 438 | 562 | 434 |
| 768 | 753 | 758 | 758 | 758 | 758 |
| 1024 | 1009 | 1014 | 1014 | 1014 | 1014 |
| 1280 | 1265 | 1270 | 1270 | 1270 | 1270 |
| 1440 | 1425 | 1430 | 1430 | 1430 | 1430 |
| 1920 | 1905 | 1910 | 1910 | 1910 | 1910 |

ScrollWidth menor que viewport refleja scrollbar y no un defecto. Mayor implica overflow documental. El scroll interno de una tabla puede ser razonable; los controles, formularios y dashboard deben reflow sin recorte. [WCAG 2.2](https://www.w3.org/TR/WCAG22/) define reflow y nombres accesibles; la medición es evidencia de fallos específicos, no declaración global de conformidad o incumplimiento de todos sus criterios.

En formularios se ven rótulos, pero no nombres asociados: 12 controles en perfil Commerce, 14 en editor, 12 en consola ADMIN comercio, 8 en promoción y filtros adicionales. Recuperación mostró éxito genérico sin aria-live/role alert. El editor vacío mostró errores de título, descripción y descuento; el validador inválido respondió claramente sin éxito. Revisar foco al error, tab order, mensajes de campo, disabled/loading y doble submit. No se hizo recorrido exhaustivo con lector de pantalla ni cálculo contrast ratio; los grises pequeños observados merecen medición, no una acusación numérica inventada. No se certificó focus trap de todos los modales. Botones pequeños detectados requieren evaluar excepciones WCAG antes de declararlos fallos.

La identidad amarillo/negro, marca PROMY y jerarquía de beneficios son reconocibles. Web oscuro se siente operativo, Landing más promocional y Mobile tiene su propio sistema de componentes; comparten marca pero no un design system contractual. Hay diferencias en redacción, acentos, densidad y estados. No son cuatro productos sin relación, pero todavía no se sienten completamente terminados como una sola experiencia.

Landing tiene hero, CTA, proceso y formularios; no desbordó en los nueve tamaños. El mojibake de FAQ/textos es real. Hay testimonios o ejemplos sin procedencia acreditada y enlaces sociales genéricos, que deben corregirse antes de captar público. Los badges revisados apuntan a acceso privado/CTA, no prueban publicación en tiendas; no se los reporta como enlaces a stores ya publicadas. La promesa de avisos futuros depende de un flujo aún no acreditado.

SEO: meta title/description, canonical, Open Graph y JSON-LD existen en HTML. No se encontraron sitemap/robots dedicados en el inventario de Landing. Indexación, ownership de dominio, previews sociales y rendimiento de origen/CDN NV. La SPA depende de JavaScript para contenido dinámico; medir con crawler/render y Core Web Vitals reales antes de añadir SSR. El sitio está orientado a Concordia; evitar afirmar cobertura/ahorros/usuarios si no derivan de datos verificados.

## 9. Mobile: código, distribución y QA pendiente

El estado técnico es consistente: typecheck, check de dependencias, doctor y export Android pasan. El export Hermes de 7,16 MB no es APK/AAB instalado ni build iOS. No se ejecutó firma EAS, upload a stores ni TestFlight; no había dispositivo/emulador controlado disponible para estas pruebas. Identificadores configurados `app.promy.mobile`, scheme `promy`, versión 1.0.0, new architecture y edge-to-edge. EAS define development/preview/production; no valida por sí solo env ni asociación al proyecto remoto.

Commerce Mobile es código vivo: navegación, dashboard, perfil, promociones y validación. No eliminarlo como «dead code» basándose en la hipótesis client-only. Decisión de producto pendiente: mantener Commerce Mobile para operación en caja o concentrarlo en Web; congelar alcance extra durante piloto sin borrar funciones precipitadamente.

Deep links por scheme y bridge de validación están implementados. El bridge compensa el uso `?code=` frente al parámetro `validationCode`; **no se reporta como bug confirmado el mismatch aislado del archivo linking**. Las prefixes HTTPS no demuestran Universal/App Links: no se verificaron asociaciones de dominio ni apertura fría/caliente instalada. Destinos notification→screen y rutas de redemptions requieren pruebas de contrato y dispositivo.

[Expo exige referencias estáticas para inlinear variables EXPO_PUBLIC](https://docs.expo.dev/guides/environment-variables/). La URL singular tiene referencia estática y el export pasó con ella; las listas usan `process.env[name]`. Es un defecto localizado de configuración, no que toda conexión Mobile esté rota.

Home usa lista paginada y componentes propios; mapas, imágenes, fuentes y pantallas extensas concentran costo. No se midieron FPS, cold start, memoria nativa, jank, consumo GPS/batería, accesibilidad TalkBack/VoiceOver, teclado ni safe areas físicas. Deben cubrirse Android de gama baja/medio e iPhone, tema/tamaño de fuente, orientación soportada, iPad al declarar supportsTablet y permisos denegados permanentemente. No recomendar cambiar FlatList por FlashList por su mera presencia como dependencia: primero profiling.

Matriz física mínima antes del piloto: instalación limpia/actualización, login y persistencia tras reiniciar, SecureStore write/read/delete/fallo, logout concurrente con refresh, 401+offline, ubicación «ahora no»/denegada/revocada, sin promociones, mapa con red lenta, QR cámara/galería/texto, generación/validación/doble intento, push en foreground/background/kill, deep link frío/caliente/autenticación pendiente y eliminación de cuenta. Evidenciar versión/build, dispositivo, SO, resultado y video/captura reproducible.

## 10. Tests, CI, dependencias y reproducibilidad

| Ejecución | Resultado | Evidencia |
|---|---|---|
| npm ci en cuatro apps limpias | PASS | `*-0.txt`, manifests baseline. |
| API npm test | PASS 29/29; incluye build | `api-3.txt`. |
| Prisma validate | PASS | `api-4.txt`. |
| Integración completa sobre DB desechable | PASS: 22 migraciones, seed y 8 smokes | `integration.txt`. |
| Web typecheck/build | PASS | `web-3/4.txt`. |
| Web refresh/Sentry harness | PASS | `web-5/6.txt`. |
| Landing typecheck/build | PASS | `landing-3/4.txt`. |
| Mobile typecheck, SecureStore/Sentry harness | PASS | `mobile-3/4/5.txt`. |
| Expo alignment/doctor | PASS, 18/18 doctor | `mobile-6/7.txt`. |
| Android export | PASS | `mobile-8.txt`; no APK/AAB/iOS. |
| GitHub CI del HEAD | PASS cinco jobs Linux/MySQL 8.4 | [run 34541033808](https://github.com/ValenGodoy26/promy/actions/runs/34541033808). |
| npm audit | API/Mobile con hallazgos; Web/Landing 0 | `*-1.txt`; exit 1 esperado con vulnerabilidades. |
| npm outdated | Paquetes con versiones posteriores | `*-2.txt`; no se actualizaron dependencias. |

La integración ejecuta auth, rate limit, onboarding Commerce, uploads, lifecycle de promociones, E2E, baja de cuenta y expiración. El entorno MySQL 8.4 fue verificado por resultado remoto del commit; los probes nuevos corrieron en MariaDB 10.4.32 local. No atribuir benchmarks MariaDB a MySQL/Linux.

Los unit tests se concentran en funciones y guardas; no hay porcentaje de cobertura real medido. No se ejecutó mutation testing formal. El «mutation mindset» sí reveló huecos concretos: si se elimina la consulta de estado en validación, si la caché conserva aprobación o si un count de cupo queda fuera de transacción, el baseline sigue verde. Las nuevas reproducciones deben convertirse en regresión del producto después de corregirlo; esta auditoría mantiene los casos fuera de su suite funcional para no modificarla.

CI tiene permisos contents:read, timeout por job, npm ci, lockfiles y cancelación de PR. Faltan harness Web/Mobile, gates de secretos/SCA/contratos/visual y artefacto firmemente asociado a SHA. Actions usan tags @v4 y MySQL image tag mutable, no digest/SHA. Branch protection y reglas de merge no se certificaron desde configuración remota. No hay evidencia de secrets productivos en el YAML: sus passwords son de DB efímera CI.

API audit nuevo: deepmerge-ts y cadena @prisma/config/prisma, severidad high de herramienta. No se demostró input HTTP explotando esa dependencia. Mobile: 24 entradas reportadas, 9 high y 15 moderate, con runtime decode-uri-component/query-string/React Navigation y tooling Expo/Metro. Los conteos son entradas de npm audit, no 24 exploits independientes. Separar causa primaria, consumidor runtime, tooling y fix compatible. Web/Landing cero advisories en esta fecha no garantiza código propio seguro. Mantener lockfiles y revisar install scripts/procedencia; no introducir overrides incompatibles para lograr un contador verde.

La compilación limpia en Windows y CI en Linux dan evidencia útil de casing/line endings. Los commits recientes corrigieron migración espacial y mayúsculas; no aparece el fallo como activo en HEAD. `.gitignore` excluye artefactos/entornos; release tracked sigue siendo deuda. No se ejecutó un diff binario reproducible de builds idénticos; hashing y npm ci garantizan trazabilidad de inputs, no reproducibilidad bit a bit de bundles/ZIP timestamp.

## 11. Performance, concurrencia y carga

Build Web: 628 módulos; dos chunks index 391,30/415,98 kB (gzip 124,03/108,68), ADMIN 59,79 kB (14,18 gzip), COMMERCE 62,83 (19,04), shared 16,94 (6), CSS 123,83 (22,44). No se suman como si todos fueran carga inicial: hay imports/chunks diferidos. Landing: JS 238,27 kB (73,27 gzip), CSS 70,40 (14,26). Mobile: Hermes 7,16 MB/37 assets. Es evidencia de artefactos; no es LCP/INP ni memoria de usuario.

Primera campaña: 100 peticiones a cada una de health, promociones, search, nearby, map y dashboard ADMIN, a concurrencias 10/50/100: **1.800 peticiones, todas HTTP 200**. Concurrencia 100: p95 nearby 408 ms, map 362 ms, dashboard 1.207 ms. Cliente y servidor compartían proceso de pruebas: RSS pico aproximado 287 MB incluye ambos y la instrumentación. No llamarlo memoria exclusiva de API.

Segunda campaña: 1.000 comercios/5.000 promociones adicionales, fixture total antes del backup 1.120 usuarios, 1.005 comercios, 5.020 promociones, 19 canjes. API y generador en procesos distintos, mismo equipo, sin WAN/CDN. Endpoint nearby con radio 8 y limit 24. IP sintética distinta por petición para simular clientes y evitar que el rate limiter por IP cambie el objeto medido; se usó el comportamiento de trust proxy observado, sin modificar código ni deshabilitar limiter.

| Concurrencia | Peticiones | HTTP 200 | Errores transporte | p50 ms | p95 ms | p99 ms | Duración ms |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 10 | 100 | 100 | 0 | 81 | 150 | 183 | 939 |
| 50 | 100 | 100 | 0 | 373 | 477 | 481 | 815 |
| 100 | 100 | 100 | 0 | 675 | 712 | 716 | 787 |
| 250 | 250 | 250 | 0 | 1382 | 1733 | 1737 | 1964 |
| 500 | 500 | 482 | 18 | 2156 | 3037 | 3050 | 3520 |

La corrida 500 no conservó inicialmente la causa individual de errores; se abrió un diagnóstico posterior: 500/500 HTTP 200, 4.373 ms de duración y readiness 200. Por lo tanto, los 18 errores originales permanecen documentados y su causa exacta es NV; no se los atribuye sin pruebas a Prisma/DB. El generador fue acotado, con deadline 15 s y condición de parada ante errores. No hubo soak prolongado, stress hasta agotar disco/memoria, percentiles WAN ni modelado estadístico de usuarios activos. Total load HTTP emitido: 1.800 + 1.050 + 500 = 3.350 solicitudes; los demás probes son adicionales.

La prueba por lotes cortos no demuestra RPS sostenidos ni «soporta 100.000 usuarios». La unidad útil para dimensionar es mezcla de requests/segundo, distribución geográfica, consultas costosas, uploads concurrentes y sesiones activas. Se necesita un benchmark representativo en staging con CPU, memoria exclusiva, pool/locks/slow queries, p95/p99 y error budget, sin gastar esfuerzo en multi-instancia antes de corregir cupos y consultas.

## 12. Observabilidad, fallos, backup y despliegue

API tiene Pino, requestId, Sentry y eventos operativos. Web/Mobile tienen inicialización/sanitizador y harness, pero la recepción en proyectos Sentry reales sigue NV. El `requestId` se instala después de parsers/CORS, por lo que algunos errores tempranos no lo llevan. No hay métricas de latencia por ruta, pool/colas, exportador ni alertas productivas acreditadas. Readiness consulta DB/config, no salud real de Redis/Resend/storage; está bien separar dependencias críticas y opcionales, pero debe documentarse qué significa «ready».

| Dependencia/fallo | Evidencia actual | Comportamiento/acción necesaria |
|---|---|---|
| DB caída | E servidor aislado apagado: health 200/53 ms, readiness 503/2.056 ms. | Correcta separación liveness/readiness; probar reinicio/recovery con proxy. |
| Redis caída | E operación pendiente tras 4 s. | Fallback prometido no oportuno; CACHE-002. |
| Redis invalidación | E contrato instalado + stub reproduce clave mal formada. | Corregir antes de activar Redis; integración externa NV. |
| Resend caída/lento | I fetch y errores 502; test provider E. | Timeout/outbox/reintento seguro; no envío ni fallo de proveedor real ejecutado. |
| R2/S3 caído | I SDK/PutObject; NV servicio. | Limitar latencia, feedback de upload, retry idempotente y rollback de referencias. |
| Sentry caído | I integración; NV delivery. | Observabilidad no debe bloquear negocio; probar recepción/sanitización por release. |
| Mapa sin proveedor/GPS | I fallbacks/estados; NV físico. | Alternativa lista/ciudad, reintento manual y permisos claros. |
| Dos réplicas | I SSE/rate limits locales. | Eventos y límites divergen; prueba dos instancias pendiente. |

Backup/restore ejecutado: dump sintético con single-transaction, routines y triggers, 1.521.994 bytes, dump ~306 ms y restauración ~947 ms en otro schema de la misma instancia aislada. Coincidieron 1.120 usuarios, 1.005 comercios, 5.020 promociones, 19 canjes y 2 triggers. SHA y evidencia en `backup.json`. No es backup off-site ni simulacro de desastre con credenciales/infraestructura perdidas. El dump sintético no debe confundirse con respaldo de la base del usuario.

Antes de piloto: backup cifrado fuera del servidor, retención y acceso limitado, RPO/RTO acordados y restauración documentada en host nuevo; propuesta inicial RPO ≤24 h/RTO ≤4 h para piloto, a validar con negocio. Para producción con más uso se necesitará PITR/binlog o equivalente y RPO menor. Rollback de app debe ser por artefacto anterior compatible; migraciones siguen expand/contract, no rollback ciego de schema con datos. No hay prueba de zero-downtime ni rollback operativo actual.

Deploy debe usar APP_ENV=production explícito, URLs HTTPS/cors exactos y JWT aleatorios, public API correcta para uploads, secrets fuera de Git y auth email real. TLS/HSTS/CSP de Web/Landing pertenecen al host/proxy: no inferirlos por Helmet de API ni por el servidor estático de QA, que sólo sirvió artefactos. CSP debe construirse según fuentes/mapa/Sentry/estilos y probarse primero report-only donde corresponda. No desplegar origin abierto si se confía un salto de proxy. SSE requiere no buffering, timeout mayor al heartbeat y drain.

No hay gate completo de infraestructura como código, health-routing, restart manager, rotación de logs, rollout/rollback, backup/restore, monitoreo y runbook con responsables verificado. Documentos operativos ya reconocen single-instance, pero las instrucciones que todavía dicen «instalar Sentry» están atrasadas. El trabajo pendiente es configuración y comprobación, no volver a implementar adaptadores existentes.

## 13. Privacidad, Argentina y operación humana

Existe política y términos, no ausencia de documentos. La contradicción comprobada es la información compartida en canjes. Además hay brechas operativas: la conservación anónima mencionada como posibilidad no está implementada, el plazo genérico de baja necesita revisión y la retención de logs carece de mecanismo acreditado. Borrar antes de 30 días no contradice por sí solo un plazo máximo de 30 días. La identidad del responsable no queda completa con «PROMY, Concordia». Verificar persona/entidad, domicilio/canales, encargados/subencargados, transferencias internacionales y finalidad/minimización de perfil, IP, tokens y ubicación.

La [AAIP informa derechos de acceso y rectificación/supresión](https://www.argentina.gob.ar/aaip/datospersonales/derechos): acceso dentro de diez días corridos y rectificación/actualización/supresión dentro de cinco días hábiles en los supuestos aplicables. Contrastar la política de 30 días y el procedimiento con la [Ley 25.326 vigente](https://www.argentina.gob.ar/normativa/nacional/64790/actualizacion) mediante revisión jurídica local. Este informe detecta brechas de implementación y copy; no certifica legalidad de cláusulas de responsabilidad, menores ni transferencias.

La autoeliminación implementada es una fortaleza, pero requiere política coherente de evidencia de canje no identificable, backups, favoritos locales, imágenes y push. No se encontró exportación completa de datos del titular: CSV Commerce es otra función. Definir canal para acceso/exportación, verificación de identidad, registro de resolución y plazos; puede ser asistido en piloto. No recolectar nacimiento/género/teléfono sólo porque hay columnas; justificar o postergar.

Soporte: faltan responsables nominales/on-call, cola de disputas y procedimiento cuando el comercio rechaza un código, no aplica beneficio, pausa el local o comunica una promoción errónea. Múltiples ADMIN comparten rol amplio; registrar quién hizo qué, nota y hora ayuda, pero no reemplaza revisión de operaciones sensibles ni recuperación de administrador. Auditoría persistida puede fallar/desaparecer por cascadas; el log debe corresponder a la mutación confirmada y no a una intención fallida.

## 14. Producto, idea, métricas y valor

La hipótesis de valor es concreta: descubrir beneficios locales vigentes y poder usarlos sin negociación ni búsqueda dispersa. Para Commerce, captar visitas en horarios útiles y medir canjes verificables; para ADMIN, asegurar oferta confiable con moderación asistida. El diferenciador defendible inicial es densidad y confianza local, no un stack más complejo. No se entrevistaron usuarios/comercios ni se midió PMF: afirmarlo sería inventar validación de mercado.

El primer riesgo de producto es abrir con poca oferta relevante o promociones que en caja no se respetan. Concentrar un corredor/barrio/categorías, onboarding asistido, condiciones simples, responsable en caja y prueba real de cada beneficio. Propuesta de experimento: 10–20 comercios comprometidos y un grupo pequeño invitado; medir oferta útil por zona/horario y repetición de canje durante varias semanas. Es diseño de piloto, no número de partners existentes ni umbral científicamente validado.

| Objetivo | Métrica propuesta y definición |
|---|---|
| Adquisición | Visita Landing→solicitud beta→invitación→instalación; fuente/fecha y denominador. |
| Activación cliente | Registro verificado→primer detalle útil→primer código→primer SUCCESS, con tiempo al valor. |
| Activación comercio | Alta→verificación→aprobación→primera promo visible→primer canje aceptado. |
| Engagement | Usuarios activos y cohortes D7/D30; favoritos locales no equivalen a intención sincronizada. |
| Conversión | SUCCESS/códigos emitidos; separar expirados, rechazados, abandonos, duplicados y fraude. |
| Valor comercio | Comercios con canjes semanales, tiempo para validar y disposición a continuar/pagar. |
| Confiabilidad | 5xx, p95, errores de cámara/código, quejas por condiciones y disponibilidad real. |
| Moderación | Backlog, tiempo a decisión, revisiones por promo, reversiones y motivos. |

Actualmente hay conteos y actividad, no instrumentación de funnel/cohortes completa. Ranking featured/hot y featuredRank son decisiones editoriales, no recomendador validado; documentar reglas y cambios para evitar favoritismo comercial invisible. Si se monetizan posiciones, identificarlas como patrocinadas y preservar calidad/condiciones. Monetización (suscripción, herramientas, destacados) es hipótesis: probar willingness-to-pay tras demostrar valor, sin introducir pagos ni comisiones de canje durante la corrección.

Re-engagement puede empezar con recordatorios opt-in útiles y notificaciones transaccionales; no enviar campañas automáticas sin consentimiento ni densidad suficiente. Automatización futura: vencimientos, checklists y recordatorios de moderación; aprobación automática por modelos antes de cerrar los invariantes agregaría riesgo. La continuidad depende de más de una persona capaz de desplegar/restaurar/moderar y atender caja, no de disponer de más frameworks.

## 15. Fortalezas, debilidades, quick wins y riesgos

| # | Fortaleza | Debilidad principal | Quick win concreto | Riesgo prioritario |
|---:|---|---|---|---|
| 1 | Loop cliente/comercio/admin real | Cupo no atómico | Separar tipo/audience de JWT SSE | Canjes excedidos y pérdida de confianza |
| 2 | Protección atómica de un mismo código | Moderación no uniforme | Predicado público único sin overwrite | Beneficio retirado aún canjeable |
| 3 | FK/unique/migraciones | Revocación incompleta | Bloquear uso de access de usuario bloqueado | Privilegios persistentes |
| 4 | CI Linux/MySQL verde | Rotación refresh concurrente | Añadir casos race a regresión | Logout o sesiones inconsistentes |
| 5 | Cuatro builds limpios | Inputs/errores 500 | Mapear errores de parser/Multer/unique | Incidentes falsos y mala UX |
| 6 | SecureStore/cookie HttpOnly | Promesa privacy incumplida | Minimizar DTO/CSV de canjes | Exposición de datos y reclamos |
| 7 | Sharp recodifica imágenes | Reflow/labels incompletos | Corregir mojibake y rótulos asociados | Operación difícil desde teléfono |
| 8 | Readiness detecta DB caída | Despliegue/DR NV | Checklist APP_ENV/secrets/origin | Pérdida de disponibilidad/datos |
| 9 | Adaptadores email/S3/Sentry existentes | Caché/geo escalan mal | UUID de upload y Redis scan batches | Estado público obsoleto y latencia |
| 10 | Identidad y propuesta local claras | PMF/densidad sin medir | Renombrar métricas/testimonios/enlaces | Piloto sin oferta útil ni retorno |

Quick win no significa que el ítem completo de seguridad quede resuelto sin regresión. Deuda técnica: invariantes, contratos, errores, módulos grandes. Deuda producto: densidad, PMF, fraude/disputas, monetización. Deuda UX: estados, labels, reflow, copy consistente. Deuda operativa: entorno, responsables, alertas, backup, retención y soporte. No mezclar estas cuatro categorías en una «reescritura».

## 16. Roadmap priorizado y criterios de listo

| Fase | Trabajo/dependencia | Complejidad orientativa | Criterio de salida |
|---|---|---|---|
| 0 — Contención | Documentación ya realizada; antes de exposición cerrar RED-001/002, COM-001, MOD-001/002, AUTH-001/002/003, PRIV-001; fijar CFG/SEC/OBS gates. | L conjunto | Reproducciones pasan con resultado esperado; revisión cruzada; ningún P1 reproducido abierto. |
| 1 — Baseline | API-001/002, DOM/CAT, upload filename, harness a CI, contratos negativos y revisión advisories; depende de reglas fase 0. | L | CI limpio con regresión de cada fix y build por SHA; riesgos dependency triados. |
| 2 — UX/producto | Responsive, labels/feedback, mojibake, métricas/copy, onboarding/caja y política privacy alineada. | M–L | Matriz 320–1920 sin overflow de controles; tareas clave completables y copy verdadero. |
| 3 — Staging | Dominio/TLS/proxy, secretos, email/storage/Sentry QA, DB target, backup off-site/restore y runbook. | L | Smoke full loop real en staging, alerta recibida, restore probado y rollback documentado. |
| 4 — QA real | Android/iOS y redes/permisos, carga representativa, aceptación comercio y prueba de moderación/cupos. | L | Evidencia por dispositivo/build; ningún fallo bloqueante en flujo de caja, login o privacidad. |
| 5 — Piloto Concordia | Oferta concentrada, onboarding asistido, soporte/medición, cohortes invitadas. | Operación continua | Beneficios respetados, métricas interpretables, incidentes resueltos y decisión basada en datos. |

**Bloqueantes exactos del piloto externo:**

1. Integridad del canje y moderación: RED-001, RED-002, COM-001, MOD-001, MOD-002 corregidos con pruebas concurrentes y en todos los canales públicos.
2. Seguridad de sesión: AUTH-001, AUTH-002 y AUTH-003 corregidos; usuario bloqueado y token SSE no pueden operar API protegida.
3. Privacidad: PRIV-001 resuelto y política/proceso de datos/baja coherentes; OBS-001 corregido antes de emitir telemetría real.
4. Despliegue seguro: CFG-001 y SEC-001 cerrados por configuración validada/fail-fast y proxy/origin aislado; APP_ENV/HTTPS/secrets/email sin valores demo. Redis debe permanecer deshabilitado hasta cerrar CACHE-001/002 o aprobar sus pruebas reales.
5. Operación: staging accesible y reproducible, backup externo con restore, alerta técnica recibida y responsable de incidentes/soporte. Es OPS-001.
6. Mobile distribuible y utilizable: QA Android/iOS del build destinado a usuarios, sesión/QR/GPS/push/deep links y permisos de la matriz de sección 9; actualmente NV.
7. Flujo de caja y onboarding utilizable: corregir reflow/labels que bloqueen tareas en dispositivos del piloto y mojibake/copy engañoso visible; aceptación con comercios y condiciones reales.

Las optimizaciones globales de caché, refactor de módulos, SSR, sistemas complejos de analítica, monetización y multi-instancia no son bloqueantes de un piloto pequeño de una instancia si sus riesgos están acotados. DOM/CAT, errores y baja histórica son P2 pero deben resolverse antes de ofrecer los escenarios afectados (promos nocturnas, catálogo amplio o historial contractual).

**Definition of Done piloto:** todos los bloqueantes anteriores cerrados con evidencia, CI del artefacto verde, cuentas/config separadas, comercios entrenados, términos/contacto reales, bitácora y plan de rollback/soporte, criterios de parada por incidentes definidos y medición mínima de activación/canje. No alcanza con que login y home abran.

**Definition of Done producción:** además del piloto satisfactorio, SLO/error budget acordados y observados, protección ADMIN/MFA y roles acorde al equipo, restauración en host alternativo/PITR según RPO, proceso de vulnerabilidades/retención/derechos, control de cambios/artefactos y migraciones compatibles, carga/soak representativos, cobertura de versiones Mobile soportadas, monitoreo y guardia con redundancia humana. Si hay varias réplicas, límites, eventos, caché e idempotencia probados en dos instancias. Cero P0/P1 sin cerrar; P2 con responsable/plazo y riesgo aceptado de forma concreta.

## 17. Plan de escala, capacidad y arquitectura objetivo

Usuarios registrados no dimensionan una infraestructura por sí solos. Los siguientes tramos son disparadores de revisión, no garantías de capacidad ni precios cotizados.

| Tramo | Arquitectura y acciones | Medición para avanzar |
|---|---|---|
| 0–100 | Una API, MySQL, assets estáticos y storage persistente; backups/alertas; moderación humana. Redis opcional deshabilitado si no probado. | Loop estable, ningún exceso de cupo, p95 y errores bajo SLO acordado. |
| 100–1.000 | Paginar historiales, optimizar queries reales, imágenes/CDN, índices según EXPLAIN; separar DB si comparte recursos y se satura. | CPU/RSS/pool/slow queries, cola de soporte y conversión por zona. |
| 1.000–10.000 | Escalado vertical primero si conviene; workers/outbox para emails/push, límites compartidos, Redis corregido. Replicas API sólo con eventos compartidos. | Carga sostenida con mix, cache hit ratio, lag/locks, restauración y costos por activo/canje. |
| 10.000–100.000+ | HA DB/backup/PITR, varias API, bus/pubsub, jobs durables, observabilidad; réplicas lectura sólo con requisitos de consistencia. | Soak, failover, capacidad geográfica, costes medidos y equipo operativo. |

No recomendar particiones, sharding, Elasticsearch ni microservicios antes de demostrar cuello de botella. Consultas de cupo deben leer/escribir fuente consistente, no replica eventualmente consistente. Un índice espacial sólo aporta si la query/engine puede usarlo. La moderación y densidad comercial también escalan; automatizar tareas repetitivas sin eliminar revisión responsable de condiciones.

Coste operativo: modelar costo fijo API/DB/backups + almacenamiento/egreso de imágenes + email/push/observabilidad + builds + tiempo de soporte/moderación. No se cotizaron proveedores ni se inventó presupuesto mensual. Para una decisión de compra, obtener precios vigentes y estimar solicitudes/GB/emails/canjes con los datos del piloto; definir alertas de gasto y límites antes de activar servicios.

Arquitectura textual recomendada para piloto:

```text
Landing estática ──► beta/stats API
Web ADMIN/COMMERCE ──HTTPS──┐
Mobile CLIENT/COMMERCE ────┼──► proxy único/origin aislado
                          │       └──► API modular (1 instancia)
                          │              ├── MySQL + migraciones
                          │              ├── storage de imágenes persistente
                          │              ├── email/push con timeout
                          │              └── logs/Sentry saneados
                          └── SSE: canal acotado, tokens exclusivos
Backups fuera del host + restore probado + soporte/alertas
```

Evolución cuando las métricas la justifiquen:

```text
CDN/estáticos → load balancer → API A / API B
                                  ├── DB primaria (invariantes transaccionales)
                                  ├── Redis: caché/límites/pubsub probados
                                  ├── outbox → workers email/push/jobs
                                  └── object storage/CDN
Telemetría compartida + despliegue por SHA + backups/PITR/failover
```

## 18. Cómo haría que PROMY se vea y se sienta como un producto terminado

| Superficie | Jerarquía/navegación | Componentes/feedback/motion | Vacíos y onboarding |
|---|---|---|---|
| Landing | Beneficio local, disponibilidad verdadera y CTA único por actor; menos promesas repetidas. | Encoding limpio, tipografía/espaciado uniforme, formularios etiquetados y confirmación de beta inequívoca; motion breve y reduced-motion. | Explicar acceso privado, ciudad/cobertura y qué ocurre tras solicitar invitación; eliminar prueba social no acreditada. |
| Mobile | Inicio prioriza oferta útil; mapa/lista intercambiables, detalle con beneficio/condiciones/vigencia/cupo y acción clara. | Tarjetas/estados compartidos, skeleton estable, feedback de código y reintento accesible; animar sólo cambios que expliquen estado. | Ubicación opcional respetada, ciudad manual, sin promos útil, verificación guiada y primera experiencia de canje. |
| ADMIN | Cola de revisión primero, filtros persistentes y métricas definidas; buscar entidad y operar sin perder contexto. | Tabla semántica, detalle accesible, confirmación/motivo para acciones sensibles; guardar/error explícitos, badges inequívocos. | Empty states con acción pertinente; checklist de revisión y bitácora real, no números decorativos. |
| COMMERCE | Acción principal de caja «validar», luego perfil y promo; distinguir pausa/suspensión/revisión. | Formulario progresivo con preview, labels/errores en campo, reflow móvil, carga por acción y resultado idempotente comprensible. | Guiar alta→verificación→aprobación→promo→primer canje; explicar rechazo y próxima acción sin depender de soporte. |

Design system mínimo compartido: tokens de color/contraste, escala tipográfica/espaciado/radios, Button/Input/Select/Alert/Badge/Card/Dialog/Table, estados loading/empty/error/success y términos de dominio. Mantener diferencias de densidad entre uso en caja y marketing. No compartir componentes React DOM con React Native por fuerza; compartir semántica y tokens donde sea práctico. No existe medición que justifique rediseñar marca completa. La prioridad es confianza, accesibilidad y consistencia de estado.

## 19. Scores y decisión por componente

Puntajes de juicio auditor, no porcentajes de tests ni certificación. Func/Seg/Cód/Test/Mant/UX/Perf/Escala/Prod corresponden a las nueve dimensiones solicitadas; en DB/CI/infra UX significa experiencia operativa/desarrollador. NV baja especialmente Prod, no implica que algo ausente se haya probado y fallado. La [justificación individual de los 72 scores](C:/PROMY/audit/2026-09-10/SCORES_Y_DECISIONES.md) desarrolla cada dimensión.

| Superficie | Func | Seg | Cód | Test | Mant | UX | Perf | Escala | Prod |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| API | 70 | 45 | 68 | 68 | 68 | 60 | 65 | 48 | 38 |
| Web ADMIN | 76 | 50 | 70 | 46 | 68 | 63 | 70 | 58 | 42 |
| Web COMMERCE | 73 | 48 | 69 | 46 | 68 | 59 | 69 | 57 | 40 |
| Landing | 77 | 68 | 71 | 40 | 73 | 66 | 72 | 80 | 52 |
| Mobile | 72 | 58 | 67 | 55 | 65 | 63 | 55 | 57 | 30 |
| Database | 78 | 62 | 77 | 76 | 70 | 67 | 63 | 54 | 45 |
| CI | 84 | 74 | 82 | 70 | 83 | 78 | 76 | 80 | 69 |
| Infrastructure readiness | 38 | 35 | 45 | 30 | 40 | 35 | 30 | 30 | 20 |

API: buena implementación funcional modular y tests, pero P1 de invariantes y autorización bajan Seguridad/Prod; carga corta y query geográfica limitan escala. ADMIN/COMMERCE: funciones reales, infraestructura/auth compartidos inseguros en casos demostrados; accesibilidad/reflow y pruebas UI insuficientes bajan UX/Test. Landing: estática escalable, buen baseline, copy corrupto y servicios reales no acreditados. Mobile: build sólido y storage hardening, sin validación física, contratos/config y auth pendientes. DB: migraciones/FK/restore pasan, pero cupos/borrado/query no resueltos. CI: reproducible y útil, cobertura/gates incompletos. Infra: está prevista/documentada, sin entorno desplegado probado.

| Componente | Decisión | Justificación |
|---|---|---|
| API y dominio | **Mantener + refactorizar focalmente** | Centralizar invariantes y transacciones, scopes JWT y contratos. No reescritura. |
| DB/Prisma | **Mantener** | Corregir semántica de cupos/bajas e índices según plan; no migrar engine por preferencia. |
| Web ADMIN/COMMERCE | **Mantener + refactorizar componentes problemáticos** | Reflow/forms/métricas y pruebas, preservando flujos existentes. |
| Landing | **Mantener** | Corregir encoding/copy y probar funnel; sin rehacer marca. |
| Mobile | **Mantener + refactorizar auth/config puntuales** | QA físico y límites de red antes de ampliar alcance. |
| CI | **Mantener y ampliar** | Agregar regresiones/harness/artefactos y gates operativos. |
| Infraestructura | **Implementar lo pendiente** | No hay una plataforma productiva verificada que justifique reescritura. |
| Copias release/duplicación obsoleta | **Eliminar del flujo de desarrollo tras archivado consciente** | Evitar fuentes ambiguas; esta auditoría no las eliminó. |

**Respuesta final: NO está listo para piloto externo hoy. Clasificación C. Sí vale la pena continuar PROMY sobre esta base, corrigiendo las partes identificadas; no hay evidencia que justifique reconstruir partes significativas del producto.**

## 20. Evidencia, comandos y cierre

Carpeta de [auditoría y scripts](C:/PROMY/audit/2026-09-10), [registro de comandos/resultados](C:/PROMY/audit/2026-09-10/COMANDOS_Y_EVIDENCIA.md), [257 instrucciones](C:/PROMY/audit/2026-09-10/COBERTURA_257.md), [94 contrastes](C:/PROMY/audit/2026-09-10/CONTRASTE_94.md). JSON principales: `runtime-probes`, `supplementary`, `operational`, `failures`, `realtime`, `backup`, `database-outage`, `ui-observations`, `repository-checks`, `zip-inspection`, `inventory`; logs baseline por aplicación y CI remoto.

El arnés supplementary tuvo un fallo de serialización BigInt al registrar metadata DB: no se oculta ni se interpreta como error del producto. Los probes anteriores quedaron guardados y las consultas de tablas/índices/EXPLAIN se ejecutaron correctamente en `operational-probes.cjs` con serializador adecuado. El arnés de Redis también requirió corregir su stub antes de obtener el resultado; se probó el módulo compilado del producto sin cambiarlo.

No se cambiaron funciones, estilos, configuraciones versionadas, migraciones ni tests del producto. No hubo push. El documento previo `AUDITORIA_REACTIVACION_2026-09-07.md` se preservó. Los únicos nuevos entregables son este informe y `audit/2026-09-10`. El estado final y hashes de evidencia se registran en `evidence/final-checks.json` y `evidence-manifest.json`; el cierre de puertos y limpieza, en `evidence/cleanup.json`. Los servidores QA y la instancia de DB creados para la auditoría se cerraron. Se retiró la carpeta temporal aislada, incluyendo dependencias instaladas, DB y dump sintéticos, después de conservar la evidencia. Las conclusiones pendientes de servicios externos/dispositivos permanecen explícitas; ninguna se presenta como aprobada.

## 21. Qué haría a partir de mañana, en este orden

Si PROMY fuera mi producto, mañana congelaría funciones nuevas y usaría este HEAD y las reproducciones como baseline. Mantendría las cuatro apps y Prisma; abriría tareas de corrección pequeñas con un responsable y prueba de salida, sin rehacer meses de trabajo.

1. **Primero haría confiable el canje:** transacción de cupo por promoción, validación del estado actual y separación de pausa/suspensión. Después unificaría filtros públicos e invalidación. Repetiría mismos códigos y códigos diferentes con cupo 1 a concurrencia 2/10/100.
2. **Cerraría sesión y alcance de tokens:** una rotación ganadora por refresh, revocación efectiva de usuario bloqueado/sesión y rechazo de JWT SSE como Bearer. Añadiría esos casos a CI, incluidos Web/Mobile simultáneos.
3. **Eliminaría las contradicciones de datos y despliegue:** minimizar DTO/CSV de clientes, sanear errores/URLs, exigir APP_ENV y secretos propios, configurar proxy que no confíe al cliente y definir qué se conserva al borrar cuenta. Resolvería los textos legales con el responsable real.
4. **Arreglaría lo que la persona ve al usarlo:** errores 400/409/413 claros, horarios/paginación, formularios con labels y reflow, Landing sin mojibake ni prueba social sin acreditar, métricas ADMIN correctamente nombradas. No cambiaría la marca.
5. **Levantaría un staging pequeño y verificable:** una API, DB target, storage/email/Sentry de QA, HTTPS, backup externo restaurable y rollback por SHA. Redis quedaría apagado hasta pasar sus pruebas. Haría un incidente simulado con alerta y responsable.
6. **Probaría builds instalados Android e iOS y caja real con cuentas QA:** permisos, red mala, sesión persistida, cámara, QR/código, push y links. Repetiría carga con mix representativo en ese entorno y conservaría evidencia por build/dispositivo.
7. **Recién con los gates cerrados invitaría al piloto en Concordia:** pocos comercios comprometidos en una zona, personal de caja entrenado, oferta vigente comprobada, soporte directo y métricas de activación/canje/quejas. Decidiría crecimiento por repetición y confianza, no por descargas ni tamaño del catálogo.

Ese orden conserva la inversión y ataca lo que puede dañar la confianza desde el primer canje. La decisión hoy es **continuar sobre esta base, corregir los bloqueantes y mantener cerrado el piloto externo hasta verificarlos**.
