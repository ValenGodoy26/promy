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

Disponible en `http://localhost:5173`.

## Variables de entorno

Usa `.env.example` como base:

```bash
cp .env.example .env
```

Variable necesaria:

```env
VITE_API_BASE_URL=http://localhost:4000/api
```

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
