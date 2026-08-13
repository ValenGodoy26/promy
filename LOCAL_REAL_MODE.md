# PROMY Local Real

Modo unico para operar PROMY como producto real en red local, sin deploy publico.

## IP local definida

- PC host API/web/landing: `192.168.1.4`
- API: `http://192.168.1.4:4000`
- API base: `http://192.168.1.4:4000/api`
- Web comercio/admin: `http://192.168.1.4:5173`
- Landing: `http://192.168.1.4:5174`

Si la IP del host cambia, actualiza los `.env` de `promy-api`, `promy-web`, `promy-landing` y `promy-mobile`.

## Regla operativa

PROMY deja de usar autodeteccion o fallbacks ambiguos como modo principal.

Desde ahora, para operar en local real:

1. La API corre en la PC host.
2. Web, landing y mobile apuntan explicitamente a `192.168.1.4`.
3. La base local usa `seed:bootstrap`, no `seed demo` como modo normal.

## Variables activas

### API

Archivo: `C:\PROMY\promy-api\.env`

Valores clave:

```env
PORT=4000
CORS_ORIGIN=http://192.168.1.4:5173,http://192.168.1.4:5174,http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174
PUBLIC_WEB_URL=http://192.168.1.4:5173
PUBLIC_API_BASE_URL=http://192.168.1.4:4000
DATABASE_URL="mysql://root:@localhost:3306/promy_db"
```

### Web

Archivo: `C:\PROMY\promy-web\.env`

```env
VITE_API_BASE_URL=http://192.168.1.4:4000/api
```

### Landing

Archivo: `C:\PROMY\promy-landing\.env`

```env
VITE_API_BASE_URL=http://192.168.1.4:4000/api
VITE_PANEL_BASE_URL=http://192.168.1.4:5173
```

### Mobile

Archivo: `C:\PROMY\promy-mobile\.env`

```env
EXPO_PUBLIC_API_URL=http://192.168.1.4:4000/api
```

## Arranque recomendado

### 1. Base limpia con bootstrap

Desde `C:\PROMY\promy-api`:

```powershell
npx prisma migrate deploy
npm run seed:bootstrap
```

Si necesitas reset total:

```powershell
npm run migrate:reset
npm run seed:bootstrap
```

## 2. Levantar API

Desde `C:\PROMY\promy-api`:

```powershell
npm run dev
```

## 3. Levantar web

Desde `C:\PROMY\promy-web`:

```powershell
npm run dev -- --host 0.0.0.0
```

## 4. Levantar landing

Desde `C:\PROMY\promy-landing`:

```powershell
npm run dev -- --host 0.0.0.0 --port 5174
```

## 5. Levantar mobile

Desde `C:\PROMY\promy-mobile`:

```powershell
npx expo start
```

En el telefono, usar la misma red Wi-Fi que la PC host.

## Verificacion minima

1. Abrir `http://192.168.1.4:5173`
2. Abrir `http://192.168.1.4:5174`
3. Confirmar que mobile consume `http://192.168.1.4:4000/api`
4. Confirmar login admin/comercio
5. Correr flujo real con datos bootstrap + comercios reales

## Criterio de uso

Este es el unico modo local recomendado para:

- QA manual
- demos privadas
- carga de comercios reales
- pruebas de canje
- validacion operativa

No usar como modo principal:

- `localhost` desde el telefono
- autodeteccion de host del bundle
- mezcla de demo seeds y datos reales
