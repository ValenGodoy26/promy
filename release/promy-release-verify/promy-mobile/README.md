# PROMY Mobile

Aplicacion mobile para clientes de PROMY.

## Stack

- Expo SDK 54
- React Native 0.81
- React Navigation
- `expo-location`
- `expo-secure-store`
- `react-native-maps`

## Que incluye

- Auth cliente con sesion persistida en SecureStore
- Home contextual por cercania
- Mapa nativo real con markers del backend
- Busqueda remota integrada contra `/api/search`
- Detalle de comercios, promociones, favoritos e historial
- Flujo de canje con QR y codigo fallback

## Desarrollo local

```bash
npm install
npx expo start
```

## Variables y configuracion

Este proyecto no necesita `.env` para correr el flujo principal si la API local responde en la URL configurada en el cliente.

Permisos relevantes ya configurados en `app.json`:

- ubicacion foreground
- secure store

## Verificacion

```bash
npx tsc --noEmit
```

## Nota de entrega

No conviene incluir en un zip tecnico:

- `.expo/`
- `node_modules/`
- archivos temporales del simulador o caches locales
