# Rollback de staging

## Regla principal

Rollback de código no equivale a rollback de base de datos. El mecanismo normal es activar el artifact de un SHA anterior validado; no ejecutar down migrations destructivas por defecto.

## Checklist

1. Identificar SHA actual, último SHA estable, alcance del incidente y compatibilidad de migraciones.
2. Ejecutar `node tools/operations/rollback-check.mjs` con artifacts y SHA actual/anterior. Ambos deben pasar manifest y checksums.
3. Detener o drenar la versión afectada mediante el supervisor del entorno.
4. Activar `releases/<sha-estable>/` como release actual. Si el host no permite symlinks, reemplazar la referencia de release configurada por el supervisor; no copiar archivos manualmente sobre un release existente.
5. Reiniciar la API y verificar `/api/health`, `/api/readiness` y el smoke read-only.
6. Registrar SHA anterior/nuevo, timestamps, motivo, resultado y operador.

## Migraciones

Si la migración fue incompatible, elegir una de estas estrategias antes del switch: forward-fix compatible, restauración aislada validada y posterior plan de recuperación, o mantener temporalmente código compatible. Un restore de DB no se ejecuta sobre staging principal con el wrapper preparado; ver [BACKUP_RESTORE.md](BACKUP_RESTORE.md).
