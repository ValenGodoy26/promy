# PROMY Release Local

Este flujo arma un paquete limpio de los cuatro proyectos sin arrastrar secretos ni residuos de desarrollo.

## Objetivo

Excluir siempre:

- `.env`
- `.env.*`
- `dist/`
- `*.log`
- `.qa/`
- `*.tsbuildinfo`

Tambien se excluyen carpetas locales que no aportan al release, como `node_modules/`, `.git/` y `.expo/`.

## Regla de hierro

No distribuyas nunca los `.zip` sueltos de la raiz del workspace ni un comprimido armado a mano.

El unico release valido es el que sale de [pack-release.ps1](/C:/PROMY/pack-release.ps1:1) dentro de `C:\PROMY\release\`.

El script ahora valida dos cosas antes de dar por bueno un release:

- que no se haya colado nada excluido en la copia limpia ni dentro del zip final
- que `promy-api` incluya `prisma/` y `prisma/schema.prisma`

## Comando unico

Desde `C:\PROMY`:

```powershell
powershell -ExecutionPolicy Bypass -File .\pack-release.ps1
```

Para revisar el plan sin copiar ni comprimir nada:

```powershell
powershell -ExecutionPolicy Bypass -File .\pack-release.ps1 -DryRun
```

## Salida

El script genera una carpeta nueva dentro de `C:\PROMY\release\` con:

- una copia limpia de `promy-api`
- una copia limpia de `promy-web`
- una copia limpia de `promy-landing`
- una copia limpia de `promy-mobile`
- un `.zip` por proyecto
- `RELEASE_NOTES.txt` con los filtros aplicados

Si alguna validacion falla, el script corta el empaquetado con error.

## Seed de produccion

Antes de cualquier deploy real:

1. Definir `APP_ENV=production`.
2. Definir `SEED_ADMIN_EMAIL`.
3. Definir `SEED_ADMIN_PASSWORD`.
4. Ejecutar `npm run setup:bootstrap` en `promy-api`.

Si `APP_ENV=production` y falta `SEED_ADMIN_PASSWORD`, el seed bootstrap ahora falla de forma explicita.

## Recomendacion operativa

Usar este empaquetado solo despues de correr al menos:

- `npm run build` en `promy-api`
- `npm run build` en `promy-web`
- `npm run build` en `promy-landing`
- `npm run typecheck` en `promy-mobile`
