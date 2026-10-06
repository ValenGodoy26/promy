# Backup y restore

Frecuencia, retención, RPO y RTO son `DECISION_REQUIRED`. Este repositorio prepara tooling; no certifica un backup hasta que exista evidencia externa de restore.

## Backup esperado

Usar `node tools/operations/staging-backup.mjs` primero sin `--execute`. El modo real exige `BACKUP_EXECUTE=1`, `MYSQL_DEFAULTS_FILE`, `BACKUP_DATABASE_URL`, `BACKUP_DESTINATION` y `RELEASE_SHA`. El password no viaja como argumento de proceso: el cliente MySQL recibe un defaults file gestionado por el entorno.

El resultado debe incluir dump consistente, timestamp UTC, SHA de release, SHA-256, metadata y destino off-site con acceso restringido/cifrado según proveedor. Verificarlo con `node tools/operations/verify-backup.mjs`.

## Restore seguro

`node tools/operations/staging-restore.mjs` sólo admite un destino cuyo nombre contenga `restore`, `recovery`, `isolated`, `test` o `qa`; rechaza staging, production, development y DBs genéricas. El modo real exige `RESTORE_EXECUTE=1` y `RESTORE_CONFIRM=RESTORE_ISOLATED_DATABASE`.

Después del restore: ejecutar `npx prisma migrate status` desde el artifact correspondiente, levantar una API aislada, verificar health/readiness y correr smoke con cuentas QA aisladas. La evidencia mínima es checksum validado, metadata, target aislado, migración, smoke, timestamp y operador.
