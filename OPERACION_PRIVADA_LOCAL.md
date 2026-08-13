# PROMY Operacion Privada Local

Guia minima para usar PROMY como producto real en entorno local, sin deploy publico y sin volver a modo demo.

## Objetivo

Operar PROMY con comercios, promociones y canjes reales de prueba, manteniendo control manual del acceso y de la calidad de los datos.

## Base operativa

- Red local definida en [LOCAL_REAL_MODE.md](C:/PROMY/LOCAL_REAL_MODE.md)
- Base limpia con `seed:bootstrap`
- Dataset local real opcional con `npm run seed:local-real`
- App cliente con acceso privado, no abierta al publico

## Reglas

1. No mezclar datos demo con comercios reales.
2. No cargar promociones placeholder como si fueran publicas.
3. No entregar acceso cliente si no hay comercios y promos visibles para mostrar.
4. Todo comercio aprobado debe tener coordenadas, rubro y al menos una imagen usable.
5. Toda promo visible debe tener vigencia, beneficio claro y condiciones cortas.

## Checklist diario

### Admin

- Revisar comercios pendientes
- Revisar promociones en revision
- Confirmar que no haya promos vencidas visibles
- Confirmar que los comercios aprobados tengan coordenadas

### Comercio

- Confirmar perfil completo
- Confirmar al menos una promo lista
- Validar un canje de prueba si hay cambios importantes

### Cliente

- Verificar Home
- Verificar Mapa
- Verificar busqueda
- Verificar detalle de promo y generacion de canje

## Checklist de alta de comercio

1. Registrar cuenta comercio
2. Verificar email
3. Completar nombre, direccion, ciudad y rubro
4. Confirmar coordenadas
5. Subir logo o portada
6. Aprobar comercio desde admin
7. Crear una promo simple y vigente
8. Aprobar promo desde admin
9. Verificar visibilidad en app

## Checklist de demo privada

1. Login admin funcionando
2. Login comercio funcionando
3. Al menos 3 comercios aprobados
4. Al menos 5 promos visibles
5. Home con contenido real
6. Mapa mostrando comercios/promos
7. Cliente puede generar canje
8. Comercio puede validarlo
9. Historial del cliente refleja el resultado

## Credenciales locales de referencia

- Admin: `admin@promy.com`
- Cliente test: `cliente.local@promy.com`
- Comercios seed: `*.concordia@promy.com`

Las passwords locales deben mantenerse solo en entorno privado. Si se comparten paquetes, no incluir `.env` ni credenciales.

## Cuando NO avanzar

- Si la DB volvio a llenarse de datos demo
- Si el mapa no muestra coordenadas reales
- Si los canjes no se pueden validar de punta a punta
- Si web o mobile dependen de fallbacks ambiguos
- Si hay copys que prometen acceso publico o stores cuando todavia no corresponde
