# PROMY Landing

Landing pública/local de PROMY.

## Desarrollo local

```bash
npm ci
npm run dev -- --host 0.0.0.0 --port 5174
```

Disponible en `http://localhost:5174` y, si Vite expone la red, también desde la IP LAN del equipo.

## Variables de entorno locales

Usá `.env.example` como base y mantené `.env` fuera de Git:

```env
VITE_API_BASE_URL=http://localhost:4000/api
VITE_PANEL_BASE_URL=http://localhost:5173
```

## Release público

La landing separa explícitamente un build local de un build público.

- `npm run build:local`: compila contra las variables locales/LAN del `.env`.
- `npm run build`: build público en modo `release` y **falla** si API/panel usan HTTP, localhost, IP privada/LAN, dominios `.invalid`, datos legales/política de conservación incompletos o si la revisión jurídica no fue marcada como finalizada.

Para preparar un release:

1. Copiá `.env.release.example` como `.env.release`.
2. Reemplazá todos los placeholders por URLs HTTPS y datos públicos reales.
3. Marcá `VITE_LEGAL_REVIEWED=true` únicamente después de la revisión jurídica final.
4. Ejecutá:

```bash
npm run test
npm run typecheck
npm run build
```

La validación del build evita publicar accidentalmente los destinos LAN usados en desarrollo.

## Limpieza de assets legacy

Después de integrar los WebP optimizados, podés eliminar los PNG antiguos y el asset viejo del hero con:

```bash
npm run cleanup:legacy-assets
```

El script elimina únicamente:

- `public/promy-logo.png`
- `public/promy-logo-square.png`
- `public/promy-p-phone.png`
- `public/promy-p-mail.png`
- `public/hero-app-screen.webp`

La UI actual usa `promy-logo.webp`, `promy-logo-square.webp`, `promy-p-phone.webp`, `promy-p-mail.webp`, `hero-app-feed.webp` y `hero-promo-card.webp`.

## Estructura

- `src/App.tsx`: orquestación, estado del formulario beta y métricas públicas.
- `src/landing/data.tsx`: contenido estático de pasos, categorías, FAQ y demos.
- `src/landing/runtime.ts`: URLs de entorno y helpers HTTP.
- `src/landing/legalConfig.ts`: datos legales públicos inyectados por entorno.
- `src/landing/hooks.ts`: comportamiento transversal de la landing.
- `src/landing/components.tsx`: piezas visuales reutilizables.
- `src/landing/sections/`: secciones públicas de la página.
- `src/styles.css`: entrypoint de estilos.
- `src/styles/`: capas CSS ordenadas por cascada (`base`, `editorial`, `refinements`, `mobile`).

La separación de CSS respeta el orden de cascada existente. Los cambios visuales de una futura iteración deben hacerse en la capa correspondiente en lugar de agregar nuevos parches al final del archivo.

## Performance baseline

La landing pausa movimiento continuo fuera del viewport, limita el parallax del hero a su sección, usa una textura raster liviana (`public/grain.png`) y evita blur/backdrop-filter en superficies grandes. Las métricas públicas se reintentan de forma manual o cuando vuelve la conexión, sin polling infinito.

`prefers-reduced-motion` desactiva los movimientos decorativos y mantiene el contenido visible.

## Hero product shot

El hero usa `public/hero-app-feed.webp` dentro del frame del teléfono y `public/hero-promo-card.webp` para la promoción flotante. Ambos assets están optimizados y reemplazan el antiguo `hero-app-screen.webp`.
