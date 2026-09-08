# Punto 3B — Auditoría de dependencias de promy-web

1. Baseline: Node 22.18.0, npm 10.9.3, React/React DOM 19.2.5, React Router DOM 7.14.1, Vite 7.3.2 y TypeScript 5.9.3.
2. Audit inicial: 8 vulnerabilidades (2 low, 0 moderate, 6 high, 0 critical).
3. Vulnerabilidades: React Router/DOM; Vite; y transitivas en @babel/core, browserslist, esbuild, nanoid y postcss.
4. Clasificación: React Router era runtime/browser; Vite tooling; las otras cinco eran transitivas de tooling.
5. Actualizados: react-router-dom, Vite y resoluciones transitivas del lockfile.
6. Versiones: react-router-dom 7.14.1 → 7.18.3; Vite 7.3.2 → 7.3.6; transitivas a versiones corregidas resueltas por npm.
7. Motivo: cerrar advisories dentro del mismo major y sin migraciones arquitectónicas.
8. Breaking changes: ninguno observado ni requerido.
9. Código: no fue necesario modificar código fuente; sólo package.json y package-lock.json.
10. React Router: login, guards, redirects por rol, rutas anidadas, ruta profunda, back/forward y navegación SPA pasaron.
11. Vite: desarrollo local y build productivo pasaron; assets, imports dinámicos y code splitting continuaron operativos.
12. React/TypeScript: no se actualizaron por no estar afectados; typecheck pasó sin supresiones.
13. Sentry: no se actualizó; sin DSN no produjo crashes. Pendiente revisar el envío actual de query strings antes de habilitarlo en producción.
14. Auth: login, cookie HttpOnly, refresh, recuperación de sesión y logout funcionaron contra la API del checkpoint 3805ccb.
15. ADMIN: dashboard, comercios, categorías, promociones, beta y auditoría validados; no había fixture pendiente para moderar sin alterar datos.
16. COMMERCE: dashboard, perfil, listado, alta, edición y canjes validados sin guardar cambios de negocio.
17. Consola/network: sin errores inesperados del upgrade. Hallazgo previo: recargas repetidas disparan dos refresh en StrictMode y pueden alcanzar el rate limit (429).
18. Build: PASS con Vite 7.3.6, 626 módulos y sin warnings de chunks sobre threshold.
19. Typecheck: PASS (`tsc -b --pretty false`).
20. Lint: no existe script lint.
21. Tests: no existe script test; la regresión se hizo manualmente contra API y DB de test.
22. Bundle: chunks principales ~388.73/415.98 KB antes y 389.98/415.98 KB después; variación mínima y no material.
23. Instalación limpia: `npm ci`, typecheck y build pasaron en copia aislada; npm ci reportó 0 vulnerabilidades.
24. Audit final: 0 low, 0 moderate, 0 high, 0 critical; total 0.
25. Vulnerabilidades restantes: ninguna en promy-web.
26. Reglas de negocio: no modificadas.
27. Alcance: no se tocaron promy-landing, promy-mobile ni Expo; API sólo se levantó para QA.
28. Higiene: no se incluyen .env, logs, dist, screenshots, dumps, caches ni secretos.
29. Commit: `chore(web): update security dependencies`.
30. Hash local: queda registrado por Git al crear el commit final de este informe.
31. Push: no realizado; requiere autorización explícita adicional.
32. Punto 3C: corregir refresh duplicado/429 bajo StrictMode, revisar query strings de Sentry y abordar el flash de carga ya conocido.
