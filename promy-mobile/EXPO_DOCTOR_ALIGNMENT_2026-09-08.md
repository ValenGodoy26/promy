# Punto 4 — Alineación Expo SDK 54

1. Inicial: Node 22.18.0, npm 10.9.3, Expo 54.0.33, React 19.1.0, React Native 0.81.5, Reanimated 4.1.7, expo-notifications 0.32.16.
2. Expo Doctor inicial: 15/18.
3. Fallos: peers directos expo-font/worklets ausentes; expo-font nativo duplicado; Expo y Notifications desalineados.
4. `expo install --check` inicial: esperaba Expo ~54.0.37 y Notifications ~0.32.17.
5. Árbol inicial expo-font: Vector Icons → 55.0.6; Expo → 14.0.11.
6. Causa: al no declararse expo-font directamente, npm resolvió rangos incompatibles en ubicaciones separadas.
7. expo-font final: 14.0.12 único y deduplicado.
8. react-native-worklets final: 0.5.1 directo y deduplicado.
9. Compatibilidad: Reanimated 4.1.7 resolvió Worklets 0.5.1; typecheck, Doctor y Metro pasaron.
10. Expo: 54.0.33 → 54.0.37; se mantuvo SDK 54.
11. Notifications: 0.32.16 → 0.32.17.
12. Directas modificadas: expo, expo-font (nueva), expo-notifications y react-native-worklets (nueva).
13. Transitivas relevantes: Expo CLI 54.0.23 → 54.0.27; expo-constants quedó único en 18.0.14; árbol Expo/Metro recalculado por patches y dedupe.
14. Doctor: 15/18 → 16/18 (font) → 17/18 (worklets) → 16/18 temporal (Expo creó constants duplicado) → 17/18 (notifications) → 18/18 (npm dedupe).
15. Expo Doctor final: 18/18, sin issues.
16. `expo install --check` final: Dependencies are up to date.
17. Typecheck final: PASS (`tsc --noEmit`).
18. Android export: PASS en workspace y copia limpia.
19. Final: 2293 módulos, 37 assets, Hermes 7.16 MB; baseline 2294 / 37 / 7.17 MB.
20. Reanimated/Worklets: compilan y bundlean sin warnings propios; prueba física pendiente.
21. Notifications: imports, handlers, permisos, listeners, canal Android y token compilan; no se envió push real.
22. Duplicados nativos restantes: ninguno detectado por Expo Doctor.
23. npm audit: 24 antes y 24 después (15 moderate, 9 high, 0 critical/low).
24. No aparecieron nuevas vulnerabilidades críticas.
25. Instalación limpia: npm ci, typecheck, install --check, Doctor, export y audit ejecutados sin node_modules/.expo/.env previos.
26. Doctor limpio: 18/18.
27. Expo SDK 54 preservado en 54.0.37.
28. React Native preservado en 0.81.5; sin major.
29. API, Web y Landing no fueron modificados.
30. Auth, navegación y reglas de negocio no fueron modificados.
31. No se incluyen secretos, credenciales, builds, exports, caches, keystores ni certificados.
32. QA físico pendiente: cámara, GPS/mapa, QR, push/background, deep links, animaciones y matriz Android/iOS.
33. Riesgos conocidos: AsyncStorage fallback sin cifrar, 24 advisories diferidos, Sentry sourcemaps/config productiva y Commerce stack sin decisión.
34. Archivos modificados: promy-mobile/package.json, package-lock.json, app.json y este informe.
35. Commit previsto: `fix(mobile): align Expo SDK dependencies`.
36. Hash local: queda registrado al crear el commit.
37. Push: no realizado; requiere autorización explícita adicional.
38. Hallazgo inesperado: actualizar Expo antes de Notifications generó temporalmente expo-constants 18.0.13/18.0.14; los rangos eran compatibles y npm dedupe lo resolvió sin overrides.
