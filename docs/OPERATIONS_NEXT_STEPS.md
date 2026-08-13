# PROMY - Operacion y Proximo Nivel

## Realtime

### Estado actual
- El realtime de PROMY hoy esta pensado para **single instance**.
- Los eventos viven en memoria dentro del proceso API.
- Esto funciona bien para local, staging simple o una unica replica.

### Riesgo al escalar
- Si el API corre en mas de una instancia, cada replica mantiene sus propios clientes SSE.
- Un evento publicado en la instancia A no necesariamente llega a los clientes conectados en la instancia B.
- Resultado: actualizaciones en vivo inconsistentes.

### Camino recomendado
1. Mantener la implementacion actual mientras PROMY corra con una sola instancia.
2. Antes de habilitar autoscaling o varias replicas, mover el broadcast a Redis Pub/Sub.
3. Dejar el proceso SSE suscripto a Redis y publicar todos los eventos operativos por ese canal.

### Checklist futuro
- Redis accesible desde API
- publisher comun para eventos admin/commerce
- subscriber por instancia
- smoke test con 2 instancias conectadas al mismo broker

## Sentry

### Objetivo
Tener visibilidad real de errores de produccion en API, web y mobile, con contexto suficiente para diagnosticar sin revisar logs manuales.

### API
- Instalar `@sentry/node`
- Inicializar en el bootstrap del servidor
- Reportar excepciones no controladas y errores del `errorHandler`
- Adjuntar `request_id`, userId, role y ruta
- Excluir datos sensibles: passwords, tokens, cookies, secretos

### Web
- Instalar `@sentry/react`
- Inicializar en el entrypoint
- Capturar errores de render, errores de rutas y errores de llamadas criticas
- Adjuntar entorno, build/version y rol de usuario cuando exista

### Mobile
- Integrar `sentry-expo` o la capa equivalente recomendada para Expo actual
- Capturar crashes, rechazos no manejados y errores de red relevantes
- Adjuntar plataforma, version de app, role y contexto de pantalla

### Criterio practico
- No bloquear deploy por no tener Sentry
- Si PROMY pasa a usuarios reales externos, subir esta prioridad
- Primero API, despues web, despues mobile
