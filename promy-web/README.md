# PROMY Web

Panel web para administracion y operacion de PROMY.

## Stack

- Vite + React 19 + TypeScript
- React Router 7
- UI custom en `src/styles.css`

## Que incluye

- Login y sesion para `ADMIN` y `COMMERCE`
- Backoffice admin con dashboard, auditoria, categorias, comercios y promociones
- Panel comercio con perfil, promociones y validacion de canjes
- Integracion tipada con la API de PROMY

## Desarrollo local

```bash
npm install
npm run dev
```

Modo recomendado:

```bash
npm run dev -- --host 0.0.0.0
```

Disponible en `http://192.168.1.4:5173` dentro de la red local.

## Variables de entorno

Usa `.env.example` como base:

```bash
cp .env.example .env
```

Variable necesaria:

```env
VITE_API_BASE_URL=http://192.168.1.4:4000/api
```

Referencia operativa:

- ver `C:\PROMY\LOCAL_REAL_MODE.md`

## Build

```bash
npm run build
```

## Estructura

```text
src/
  components/
  features/
    admin/
    commerce/
    public/
  lib/
  types/
```

## Nota de entrega

No conviene incluir en un zip tecnico:

- `.env`
- `dist/`
- `*.tsbuildinfo`
