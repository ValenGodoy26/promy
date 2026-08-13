# PROMY Landing

Landing publica/local de PROMY.

## Desarrollo local

```bash
npm install
npm run dev -- --host 0.0.0.0 --port 5174
```

Disponible en `http://192.168.1.4:5174` dentro de la red local.

## Variables de entorno

Usa `.env.example` como base:

```env
VITE_API_BASE_URL=http://192.168.1.4:4000/api
VITE_PANEL_BASE_URL=http://192.168.1.4:5173
```

## Referencia

- ver `C:\PROMY\LOCAL_REAL_MODE.md`
