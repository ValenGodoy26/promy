# PROMY — Inventario y lifecycle de datos (pre-piloto)

Estado: técnico, 2026-09-14. Este documento no certifica cumplimiento legal. Las decisiones marcadas `DECISION_REQUIRED` deben resolverse antes de incorporar usuarios externos.

## Clasificación de estado

- `IMPLEMENTED`: comportamiento comprobable en el código y cubierto por gates técnicos.
- `DECISION_REQUIRED`: definición empresarial, operativa o de producto todavía pendiente.
- `EXTERNAL/LEGAL_REVIEW_REQUIRED`: garantía que depende de un proveedor real o de revisión jurídica competente y que PROMY no declara resuelta.

## Matriz de datos

| Categoría | Finalidad | Almacenamiento actual | Visibilidad | Baja/eliminación actual | Retención propuesta |
|---|---|---|---|---|---|
| CLIENT: nombre, email, teléfono, fecha de nacimiento, país, género | Cuenta y perfil | MySQL `User` | propio usuario; ADMIN según endpoints autorizados | baja CLIENT: eliminación inmediata | mientras exista la cuenta |
| Password hash y tokens de verificación/reset | autenticación | MySQL `User` | backend | eliminación con `User` | mientras exista la cuenta o venza el token |
| Sesiones, IP y user-agent de sesión | autenticación y seguridad | MySQL `Session` | backend | eliminación con la baja | purga periódica de vencidos: `DECISION_REQUIRED` |
| Push tokens | notificaciones | MySQL `PushToken` | backend | eliminación con la baja | mientras dispositivo/cuenta estén activos |
| Notificaciones | feedback operativo | MySQL `AppNotification` | usuario y backend | eliminación con la baja | mientras exista la cuenta; política de purga: `DECISION_REQUIRED` |
| Favoritos CLIENT | conveniencia | almacenamiento local Mobile; no hay tabla backend | dispositivo | se eliminan al limpiar/desinstalar la app | mantener local mientras no exista necesidad de sincronización |
| Ubicación CLIENT | nearby/mapa | usada en request; no se conserva historial GPS en schema | backend durante request | no hay historial que borrar | no persistir sin nuevo consentimiento/finalidad |
| Canjes no consumados | operación temporal | MySQL `Redemption` | CLIENT/Commerce/backend | se eliminan al dar de baja CLIENT | hasta resolución o baja |
| Canjes `SUCCESS` | hecho comercial, cupos y métricas | MySQL `Redemption` | Commerce/ADMIN sin contacto CLIENT | se conserva con `userId=NULL` | período histórico/legal: `DECISION_REQUIRED`; nunca reidentificar |
| Comercio: identidad del responsable y contacto | onboarding/operación | `User` + `Commerce` | owner y ADMIN; datos públicos mínimos según catálogo | no hay baja automática Commerce | proceso asistido y retención legal: `DECISION_REQUIRED` |
| Comercio: dirección/coordenadas | mapa y descubrimiento | MySQL `Commerce`/POINT | catálogo público si elegible; owner/ADMIN | ligado al lifecycle Commerce | mientras opere; baja asistida pendiente |
| Logos, covers e imágenes de promociones | contenido público | filesystem local o S3-compatible; URL en MySQL | público cuando el registro es visible | replace/delete limpia objeto gestionado; huérfanos auditables con gracia | objeto referenciado + reconciliación; backups del provider: `DECISION_REQUIRED` |
| Promociones y redemptions Commerce | catálogo/historia | MySQL | Commerce/ADMIN y parte pública elegible | promociones con canjes no se borran | período comercial: `DECISION_REQUIRED` |
| Admin audit logs | moderación/seguridad | MySQL `AdminActionLog` | ADMIN | no existe purga automatizada | finalidad, inmutabilidad y plazo: `DECISION_REQUIRED` |
| Logs API/Sentry | diagnóstico y seguridad | stdout/plataforma/Sentry si se configura | operación técnica | sanitización activa; retención depende del proveedor | proveedor, acceso y plazo: `DECISION_REQUIRED` |
| Solicitudes beta: email, ciudad, plataforma, metadata | gestionar acceso pre-piloto | MySQL `BetaAccessRequest` | operación autorizada | no existe endpoint/purga | consentimiento, canal de baja y plazo: `DECISION_REQUIRED` |
| Backups | recuperación | infraestructura todavía no definida | operación restringida | borrado individual no demostrado en copias | arquitectura, cifrado, expiración y restauración: `DECISION_REQUIRED` |

## Baja CLIENT — IMPLEMENTED

1. Se eliminan canjes `PENDING`, `FAILED` o `CANCELLED` del usuario.
2. Se eliminan sesiones, push tokens y notificaciones.
3. Se elimina físicamente `User`, incluyendo identidad, contacto, credenciales y tokens.
4. La FK de canjes `SUCCESS` aplica `ON DELETE SET NULL`: permanece el hecho comercial sin vínculo al usuario.
5. Login, refresh y access token dejan de funcionar; Commerce y ADMIN ven “Cuenta eliminada”, nunca la identidad anterior.

No se conserva email original, email sustituto ni hash del email. Una cuenta recreada es una identidad nueva; una eventual prevención de reutilización por persona requiere una decisión antifraude separada y una base jurídica explícita.

## Uploads — IMPLEMENTED

- Antes de decodificar se valida ancho, alto y presupuesto total de píxeles.
- Sharp admite como máximo dos procesamientos simultáneos y seis en espera; exceso devuelve 429.
- En replace se persiste primero la referencia nueva y después se intenta borrar el objeto anterior.
- Si falla la persistencia, se intenta borrar el objeto nuevo como compensación.
- El borrado es idempotente y sólo acepta paths gestionados `commerce/<uuid>-<nombre>.webp`.
- `npm run uploads:audit` compara storage con referencias DB, usa 24 h de gracia y es dry-run. `-- --delete` exige una acción explícita.
- Local y cliente S3 fake están cubiertos. La validación contra R2 real queda `EXTERNAL/LEGAL_REVIEW_REQUIRED` (`EXTERNAL_PROVIDER_VALIDATION_PENDING`).

## Decisiones previas al piloto — DECISION_REQUIRED / EXTERNAL/LEGAL_REVIEW_REQUIRED

- `DECISION_REQUIRED`: responsable jurídico, domicilio y canales oficiales verificables.
- `DECISION_REQUIRED`: proceso y plazos para derechos, cuentas Commerce/Admin y solicitudes beta.
- `DECISION_REQUIRED`: retención/purga de logs, auditoría, canjes históricos y sesiones vencidas.
- `DECISION_REQUIRED`: política de backups y propagación de borrados.
- `EXTERNAL/LEGAL_REVIEW_REQUIRED`: revisión jurídica argentina del texto público.
