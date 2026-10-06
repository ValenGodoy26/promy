# Respuesta a incidentes

`OWNER`, `ALERT_CHANNEL` y `SUPPORT_CHANNEL` son `DECISION_REQUIRED`. Este runbook no fija SLA, SLO, RPO ni RTO.

1. **Detectar:** conservar hora UTC, alerta o síntoma sin copiar secretos.
2. **Clasificar:** disponibilidad, autenticación, datos, proxy/TLS, proveedor o release.
3. **Correlacionar:** identificar `requestId`, SHA/release, ruta, rol y logs sanitizados. Sentry sólo se consulta si está configurado.
4. **Evaluar alcance:** confirmar si afecta un actor, una operación o todo el ambiente.
5. **Decidir:** continuar observando, mitigar, deshabilitar una capacidad o ejecutar rollback según [ROLLBACK.md](ROLLBACK.md).
6. **Verificar recuperación:** health, readiness y smoke read-only; usar full-loop únicamente con cuentas QA y opt-in.
7. **Registrar evidencia:** timestamp, SHA, impacto, requestId si existe, acciones, resultado y operador en el repositorio de evidencia externo.
8. **Post-incidente:** documentar causa, acción correctiva y decisión pendiente sin incluir PII ni secretos.

Ejercicio seguro futuro: provocar una respuesta controlada en una ruta QA, comprobar requestId/log/Sentry/alerta, recuperar la ruta y ejecutar smoke read-only. No generar errores en producción para probar alertas.
