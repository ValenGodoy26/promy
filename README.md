# Promy

Plataforma de comida local compuesta por una aplicación móvil, una aplicación web administrativa, una landing page y una API central.

## Tecnologías

### Aplicación móvil
- React Native
- Expo
- TypeScript

### Web
- React
- TypeScript
- Vite

### Backend
- Node.js
- Express
- TypeScript
- Prisma

## Componentes

- promy-mobile/: aplicación móvil
- promy-web/: panel administrativo
- promy-landing/: landing pública
- promy-api/: API backend

## CI / Checks

GitHub Actions valida automáticamente cada push a `main` y cada pull request dirigido a
`main` con instalaciones limpias y jobs independientes:

- **API:** build, 29 unit tests y validación del schema Prisma.
- **API Integration:** MySQL 8.4 efímero, migraciones, seed y suite completa de integración/E2E.
- **Web:** typecheck y build de producción.
- **Landing:** typecheck y build de producción.
- **Mobile:** typecheck, alineación de dependencias Expo, Expo Doctor y export Android.

El CI utiliza Node 22, cachea únicamente la descarga de paquetes npm y siempre ejecuta
`npm ci`; no conserva `node_modules`, builds ni exports como artifacts.

## Características

- Aplicación móvil para usuarios
- Panel administrativo web
- Landing pública
- API centralizada
- Arquitectura multiproyecto
- Persistencia de datos mediante Prisma

## Autor

Desarrollado por Valentín Godoy.
