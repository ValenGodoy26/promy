# Evidencia operacional futura

La evidencia runtime no se versiona junto al código ni contiene secretos, passwords, cookies, tokens, dumps, PII o logs completos. Debe conservarse como artifact/control de acceso externo.

Formato recomendado por ejercicio: `timestampUtc`, `environment`, `releaseSha`, `operator`, `health`, `readiness`, `proxyTls`, `smoke`, `email`, `storage`, `sentryAlert`, `backupChecksum`, `restore`, `rollback`, `notes`. Adjuntar sólo referencias seguras a logs/alertas y el checksum del backup.
