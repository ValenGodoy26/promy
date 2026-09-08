# Punto 3C — Auditoría de dependencias de promy-landing

1. Versiones iniciales: Node 22.18.0, npm 10.9.3, React/React DOM 19.2.5, React Router DOM 7.14.1, Vite 7.3.2 y TypeScript 5.9.3.
2. Audit inicial: el primer audit sobre la instalación existente informó 0; al regenerar el árbol tras el primer update aparecieron 6 (2 low, 4 high), que junto con las 2 high corregidas por Router reconstruyen el baseline real de 8 (2 low, 6 high).
3. Vulnerabilidades: React Router/DOM, Vite y transitivas @babel/core, browserslist, esbuild, nanoid y postcss.
4. Clasificación: Router runtime/browser; Vite tooling directo; las otras cinco transitivas de tooling.
5. Actualizados: react-router-dom, Vite y resoluciones transitivas vulnerables del lockfile.
6. Versiones: react-router-dom 7.14.1 → 7.18.3 y Vite 7.3.2 → 7.3.6.
7. Motivo: cerrar advisories con updates mínimos dentro del mismo major y mantener consistencia segura con promy-web.
8. Breaking changes: ninguno observado.
9. Código: no fue necesario modificar fuentes; sólo package.json y package-lock.json.
10. React Router: home, anchors, back/forward y refresh directo funcionaron; no se cambiaron URLs.
11. Vite: dev server y build productivo pasaron; assets, CSS, imports y variables VITE_* funcionaron.
12. React/TypeScript: no se actualizaron por no estar afectados; typecheck pasó sin supresiones.
13. Formulario beta: validación nativa, campos, POST a API de QA, 201 y mensaje de éxito confirmados; el registro sintético fue eliminado luego.
14. Desktop: header, hero, CTAs, cards, secciones, formulario y footer renderizaron sin regresión atribuible al upgrade.
15. Mobile 390×844: navegación, hero, CTA, formulario y footer respondieron; no hubo overflow horizontal.
16. Consola: 0 errores y 0 warnings inesperados.
17. Network: stats públicos 200/304 y beta POST 201; sin assets 404 ni fallas nuevas. El email de confirmación no se envió porque el proveedor no está configurado en QA, sin afectar el 201.
18. Preexistentes: mojibake, URLs LAN del ejemplo, redes genéricas, badges y testimonios; no se corrigieron.
19. Build final: PASS con Vite 7.3.6, 29 módulos transformados y sin warnings.
20. Typecheck: PASS (`tsc -b --pretty false`).
21. Lint: no existe script lint.
22. Tests: no existe script test; se realizó regresión técnica/visual manual.
23. Bundle: JS 238.28/73.27 KB gzip antes y 238.18/73.24 KB después; CSS idéntico 70.40/14.26 KB.
24. Instalación limpia: npm ci, typecheck, build y audit pasaron en copia aislada.
25. Audit final: 0 low, 0 moderate, 0 high, 0 critical; total 0.
26. Vulnerabilidades restantes: ninguna en promy-landing.
27. Contenido/diseño: no fueron corregidos ni rediseñados.
28. Alcance: no se modificaron Web, Mobile, Expo ni API; API sólo se levantó para QA.
29. Higiene: no se incluyen .env, dist, logs, screenshots, dumps, caches, temporales ni secretos.
30. Commit: `chore(landing): update security dependencies`.
31. Hash local: queda registrado por Git al crear el commit final.
32. Push: no realizado; requiere autorización explícita adicional.
33. Fase posterior: corregir mojibake, URLs/links/badges/testimonios y revisar el comportamiento visual preexistente de animaciones/reveals en capturas full-page.
