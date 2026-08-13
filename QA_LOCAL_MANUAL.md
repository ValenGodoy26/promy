# PROMY Local QA Manual

Este checklist sirve para validar PROMY en entorno local con datos reales de prueba, sin depender de seeds demo visibles.

## Preparacion

1. Levantar API local con migraciones aplicadas.
2. Levantar `promy-web`.
3. Levantar `promy-mobile` con Expo.
4. Confirmar que el admin local puede iniciar sesion.
5. Usar emails nuevos para cada corrida QA.

## Flujo Cliente

### 1. Registro cliente
- Ir a la app mobile.
- Crear cuenta cliente con email nuevo.
- Esperado: cuenta creada sin crash ni mensajes ambiguos.
- Revisar:
  - validacion de email
  - validacion de password
  - errores de red

### 2. Login cliente
- Iniciar sesion con la cuenta creada.
- Esperado: entra a home y persiste sesion.
- Revisar:
  - refresh token
  - cierre y reapertura de app
  - logout limpio

### 3. Fallback de ubicacion
- Negar permiso de ubicacion.
- Esperado: la app sigue funcionando con fallback de ciudad activa.
- Revisar:
  - home
  - explorar
  - mapa
  - mensajes de fallback

### 4. Catalogo publico
- Buscar la promo aprobada desde:
  - home
  - explorar
  - mapa
  - detalle de comercio
- Esperado: misma promo visible en todos los puntos publicos.

### 5. Canje cliente
- Abrir detalle de promo.
- Generar canje.
- Esperado:
  - canje en `PENDING`
  - QR o codigo visible
  - mensaje claro

### 6. Historial cliente
- Ir a historial de canjes.
- Esperado: aparece el canje pendiente y luego exitoso cuando se valida.

## Flujo Comercio

### 7. Registro comercio
- Ir a web publica.
- Crear cuenta comercio con email nuevo.
- Esperado:
  - alta correcta
  - email de verificacion disponible

### 8. Verificacion email comercio
- Verificar email desde la ruta web.
- Esperado: cuenta verificada y login operativo.

### 9. Completar perfil comercio
- Entrar al panel comercio.
- Completar:
  - descripcion
  - direccion
  - coordenadas
  - logo
  - cover
- Esperado: guardado exitoso y sin errores confusos.

### 10. Crear promocion
- Crear una promo nueva en `DRAFT`.
- Pasarla a `PENDING_REVIEW`.
- Esperado:
  - validaciones correctas
  - no deja operar si falta readiness del comercio

### 11. Validar canje
- Ir a canjes del comercio.
- Validar por codigo manual o QR de respaldo.
- Esperado:
  - cambio a `SUCCESS`
  - feedback inmediato
  - no permite doble validacion

## Flujo Admin

### 12. Aprobar comercio
- Ingresar al panel admin.
- Buscar el comercio nuevo.
- Intentar aprobarlo antes de completar readiness.
- Esperado: bloqueo con mensaje claro.
- Completar readiness y reintentar.
- Esperado: `APPROVED`.

### 13. Moderar promocion
- Buscar promo nueva.
- Aprobarla.
- Esperado: pasa a `APPROVED_VISIBLE`.

### 14. Dashboard admin
- Revisar dashboard y listas.
- Esperado:
  - el comercio figura
  - la promo figura
  - el canje figura

## Casos Negativos Minimos

### 15. Promo fuera de horario
- Crear promo futura o fuera de ventana horaria.
- Esperado: no aparece publica.

### 16. Promo vencida
- Revisar una promo vencida.
- Esperado:
  - no visible en catalogo publico
  - no canjeable

### 17. Comercio no aprobado
- Probar operar promociones antes de aprobar comercio.
- Esperado: bloqueo claro.

### 18. Email no verificado
- Probar operar promociones con owner no verificado.
- Esperado: bloqueo claro.

### 19. Sesion vencida
- Forzar expiracion o invalidacion.
- Esperado:
  - refresh si corresponde
  - si no, vuelta al login con mensaje claro

## Criterio de salida

PROMY queda "casi listo" en local cuando:

- cliente puede registrarse, loguearse, explorar y canjear
- comercio puede registrarse, verificar email, completar perfil y crear promo
- admin puede aprobar comercio y promo
- la promo se ve en mobile
- el canje se valida y queda en historial
- no hay textos fake evidentes ni defaults demo confusos
- no hay errores 500 en flujo normal
