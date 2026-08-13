# PROMY Platform Blueprint

## Superficies del producto

PROMY se organiza en tres superficies conectadas a una sola API:

1. `mobile-client`
   Experiencia de usuario final para descubrir, guardar y canjear promociones.

2. `web-commerce`
   Panel operativo del comercio para gestionar su negocio dentro de PROMY.

3. `web-admin`
   Backoffice interno para moderación, aprobación y control general de la plataforma.

## Roles

### CLIENT

- Descubre promociones y comercios.
- Navega mapa, explorar y favoritos.
- Canjea promociones.
- Ve historial y perfil.

### COMMERCE

- Administra el perfil de su comercio.
- Crea, edita y elimina promociones.
- Revisa canjes/redemptions.
- Consulta métricas básicas de operación.

### ADMIN

- Supervisa la plataforma.
- Aprueba, rechaza o inactiva comercios.
- Activa o inactiva promociones.
- Revisa métricas globales y actividad reciente.

## Entidades principales

### User

- `role`: `CLIENT | COMMERCE | ADMIN`
- `status`: `ACTIVE | BLOCKED | PENDING`

### Commerce

- Pertenece a un `ownerUserId`.
- Tiene `status`: `PENDING | APPROVED | REJECTED | INACTIVE`
- Solo un comercio `APPROVED` puede operar promociones.

### Promotion

- Pertenece a un comercio.
- Tiene `status`: `ACTIVE | INACTIVE | EXPIRED`
- Se administra desde comercio y se modera desde admin.

### Redemption

- Une usuario, comercio y promoción.
- Tiene `status`: `PENDING | SUCCESS | FAILED | CANCELLED`
- Es la base del valor real de PROMY porque representa uso efectivo.

## Reglas de permisos

### Auth base

- Toda ruta privada exige access token válido.
- `refresh token` renueva sesión sin forzar logout inmediato.
- `logout` invalida la sesión persistida del backend.

### CLIENT

- Solo consume endpoints públicos y sus propios canjes.
- No puede acceder a paneles internos ni recursos administrativos.

### COMMERCE

- Debe tener rol `COMMERCE`.
- Debe tener un comercio asociado para entrar al panel.
- Puede ver su dashboard, su comercio, sus promociones y sus canjes.
- Solo puede crear/editar/eliminar promociones si su comercio está `APPROVED`.

### ADMIN

- Debe tener rol `ADMIN`.
- Puede ver métricas globales.
- Puede moderar comercios y promociones.
- No comparte navegación con clientes ni comercios.

## Flujos clave

### Flujo CLIENT

1. Login o registro.
2. Explorar promociones/comercios.
3. Ver detalle.
4. Canjear promoción.
5. Ver historial.

### Flujo COMMERCE

1. Login web.
2. Redirección automática a panel commerce.
3. Ver dashboard del comercio.
4. Editar "Mi comercio".
5. Gestionar promociones.
6. Revisar canjes.

### Flujo ADMIN

1. Login web.
2. Redirección automática a panel admin.
3. Ver dashboard global.
4. Revisar comercios pendientes.
5. Aprobar/rechazar/inactivar.
6. Moderar promociones.

## Orden recomendado de construcción

1. Cerrar backend multirol y permisos.
2. Crear shell web con login y redirección por rol.
3. Construir panel `COMMERCE`.
4. Construir panel `ADMIN`.
5. Mantener mobile enfocado exclusivamente en `CLIENT`.
