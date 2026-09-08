# Punto 3D — Auditoría de dependencias de promy-mobile

1. Inicial: Node 22.18.0; npm 10.9.3; Expo 54.0.33; React 19.1.0; React Native 0.81.5; React Navigation native 7.2.2 / tabs 7.15.10 / stack 7.14.12; Reanimated 4.1.7; Sentry 7.2.0.
2. Audit inicial reproducible con npm ci: 34 (1 low, 16 moderate, 15 high, 2 critical).
3. Vulnerables: Babel, xmldom, brace-expansion, browserslist, decode-uri-component/query-string/navigation, Metro/image-size, js-yaml, nanoid, PostCSS, shell-quote, tar, undici, uuid/xcode y ws.
4. Críticas: shell-quote y tar; ambas transitivas de tooling/desarrollo, no código de negocio dentro del bundle de la app.
5. Clasificación: navegación/query-string es runtime JS; Expo CLI/Metro/config y restantes cadenas son tooling/build; todas las vulnerabilidades raíz eran transitivas salvo los agregados de npm sobre Expo/Navigation.
6. shell-quote: react-native 0.81.5 → react-devtools-core 6.1.5 → shell-quote 1.8.3.
7. tar: expo 54.0.33 → @expo/cli 54.0.23 → tar 7.5.13.
8. Actualizados: shell-quote, tar, @babel/core, @xmldom/xmldom, brace-expansion, browserslist, js-yaml, nanoid, undici y ws.
9. Críticas: shell-quote 1.8.3 → 1.10.0; tar 7.5.13 → 7.5.22. Las demás transitivas se resolvieron a versiones corregidas compatibles en package-lock.
10. expo install: ninguno; no fue necesario modificar módulos Expo directos para los fixes aplicados.
11. Motivo: eliminar fixes disponibles sin major y evitar overrides o combinaciones nativas no soportadas.
12. Breaking changes: ninguno observado; no cambiaron versiones directas ni package.json.
13. Código: no se requirieron ajustes de fuente.
14. React Navigation: compiló/exportó intacto; la cadena decode-uri-component permanece sin fix publicado. No se hizo prueba interactiva por falta de emulador/dispositivo.
15. Reanimated/Worklets: sin cambios; export correcto. El peer react-native-worklets sigue pendiente del Punto 4.
16. SecureStore/AsyncStorage: sin cambios; persistencia, migración y limpieza conservan el código previo. El fallback no cifrado sigue como riesgo documentado.
17. Auth mobile: contrato x-promy-client: mobile, refresh JSON, rotación y logout no fueron modificados; typecheck/export y suite API previa protegen el contrato.
18. Sentry: sin cambios; configuración compila sin credenciales productivas. El export sólo advierte que faltan organization/project, esperado fuera de staging.
19. Librerías nativas: ninguna fue actualizada; camera, location, maps, notifications, QR, SecureStore y SVG conservaron versiones.
20. Typecheck final: PASS (`tsc --noEmit`).
21. Expo Doctor: 15/18 antes y 15/18 después; no empeoró.
22. Export Android: PASS en workspace y copia limpia, 37 assets, sin errores Metro.
23. Módulos/bundle: 2294 y Hermes 7.17 MB antes; 2294 y 7.17 MB después.
24. Validación funcional: arranque de Metro/export, árbol de navegación, linking, auth/storage y módulos sensibles revisados estáticamente; no hubo runtime interactivo por ausencia de ADB/emulador.
25. No validadas físicamente: login/UI, cámara, QR real, mapa/GPS, push/background, deep links nativos, biometría y matriz iOS/Android.
26. Instalación limpia: npm ci, typecheck, expo-doctor, export Android y audit ejecutados en copia sin node_modules, .expo, builds, caches ni .env.
27. Audit final: 24 (0 low, 15 moderate, 9 high, 0 critical), reducción de 34 a 24 y eliminación de ambas críticas.
28. Runtime restante: cadena moderada decode-uri-component → query-string → React Navigation; sin fix disponible según npm.
29. Tooling restante: 9 high y parte de las 15 moderate agregadas por Expo/Metro/config/image-size/PostCSS/uuid/xcode.
30. Justificación: npm sólo propone Expo 57.0.20 como fix para tooling (major riesgoso); navegación no tiene fix. Se difieren, sin --force ni overrides.
31. No se hizo upgrade general de Expo SDK ni React Native.
32. No se modificaron API, Web ni Landing.
33. No se cambiaron reglas de negocio, navegación ni auth.
34. No se versionan .env, .expo, exports, builds, logs, credenciales, certificados ni signing files.
35. Commit previsto: `chore(mobile): update security dependencies`.
36. Hash local: queda registrado al crear el commit.
37. Push: no realizado; requiere autorización explícita adicional.
38. Punto 4: instalar peers expo-font/worklets con expo install, deduplicar expo-font y alinear Expo ~54.0.37 + notifications ~0.32.17; evaluar después la ruta segura hacia un SDK que cierre Metro.
39. Riesgos adicionales: fallback de tokens a AsyncStorage sin cifrar; deprecations transitivas (glob/rimraf/inflight/text-encoding); Sentry sin config de sourcemaps; pruebas físicas pendientes.
