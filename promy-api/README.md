# PROMY API

Backend principal de PROMY.

## Stack

- Node.js + Express + TypeScript
- Prisma ORM
- MySQL
- JWT + refresh tokens persistidos

## Modulos principales

- Auth y sesiones
- Comercios y promociones
- Canjes y validacion
- Geolocalizacion: `nearby`, `map/markers`, `search`
- Admin: auditoria, moderacion, categorias y readiness del mapa

## Desarrollo local

```bash
npm install
npm run dev
```

Modo recomendado de trabajo:

- usa `C:\PROMY\LOCAL_REAL_MODE.md`
- opera con `seed:bootstrap`
- usa la IP local de la PC host en vez de depender de `localhost` desde mobile

## Variables de entorno

Usa `.env.example` como base:

```bash
cp .env.example .env
```

Variables esperadas:

```env
PORT=4000
APP_ENV=development
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
PUBLIC_WEB_URL=http://localhost:5173
PUBLIC_API_BASE_URL=http://localhost:4000
JWT_SECRET=tu-secreto-largo-y-aleatorio
JWT_REFRESH_SECRET=tu-refresh-secreto-largo-y-aleatorio
AUTH_EMAIL_PROVIDER=console
AUTH_EMAIL_FROM="PROMY <no-reply@promy.app>"
UPLOADS_DRIVER=local
DATABASE_URL=mysql://user:password@localhost:3306/promy
```

Reglas de seguridad de arranque:

- En `production`, `JWT_SECRET` y `JWT_REFRESH_SECRET` deben ser secretos aleatorios de al menos 32 caracteres.
- En `production`, `AUTH_EMAIL_PROVIDER` debe ser `resend`.
- `AUTH_EMAIL_PROVIDER=test` no envia trafico externo, expone previews de tokens para QA y solo es valido con `APP_ENV=test`.
- En `production`, `AUTH_EMAIL_FROM`, `RESEND_API_KEY`, `PUBLIC_WEB_URL` y `CORS_ORIGIN` explicito son obligatorios.
- En `production`, `CORS_ORIGIN` no puede ser `*`.
- Si `UPLOADS_DRIVER=local`, conviene definir `PUBLIC_API_BASE_URL` para construir URLs publicas estables.
- Si `UPLOADS_DRIVER=s3`, debes definir `UPLOADS_PUBLIC_BASE_URL`, `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID` y `S3_SECRET_ACCESS_KEY`. Cloudflare R2 funciona con `S3_REGION=auto`.

## Prisma

```bash
npx prisma generate
npx prisma migrate dev
node prisma/seed.js
```

Seeds disponibles:

- `node prisma/seed.js` usa `SEED_MODE=demo` en desarrollo y `bootstrap` en produccion.
- `set SEED_MODE=bootstrap&& node prisma/seed.js` crea solo catalogos base + admin inicial.
- En `APP_ENV=production`, `SEED_ADMIN_PASSWORD` es obligatoria. El bootstrap aborta si falta.

Para el modo local real de PROMY, usar:

```powershell
npm run seed:bootstrap
```

## Build

```bash
npm run build
```

## Checks rapidos

```bash
npm run check
```

Eso compila TypeScript y corre los tests unitarios actuales.

## QA server local

Para smoke tests y staging local, usa un unico server QA en puerto `4013`:

```bash
npm run qa:start
npm run qa:status
npm run qa:stop
npm run qa:smoke:expiration
npm run qa:smoke:promotion-lifecycle
```

Esto guarda estado y logs en `C:\PROMY\promy-api\.qa\`.

La smoke de expiracion:

- crea un comercio y una promo QA temporales;
- valida que la promo vencida no salga en `/promotions`, `/search` ni en el marker del mapa;
- ejecuta el barrido real de expiracion y comprueba la materializacion a `EXPIRED`;
- verifica el estado en admin y comercio;
- confirma que admin no pueda volverla a `APPROVED_VISIBLE`;
- limpia los datos temporales al terminar.

La smoke de lifecycle de promociones:

- crea un comercio QA operable y una promo nueva en `DRAFT`;
- manda la promo a `PENDING_REVIEW` desde el panel de comercio;
- hace rechazo admin con nota, reenvio del comercio y aprobacion a `APPROVED_VISIBLE`;
- valida que la promo visible aparezca en `/promotions`, `/search` y `/map/markers`;
- edita la promo visible y confirma que vuelva automaticamente a `PENDING_REVIEW` y salga del publico;
- limpia usuarios, sesiones y datos temporales al terminar.

## Integration suite reproducible

Para una pasada mas seria con API + DB real:

```powershell
$env:TEST_DATABASE_URL="mysql://user:password@localhost:3306/promy_test"
npm run test:integration
```

La suite:

- valida estrictamente que `TEST_DATABASE_URL` nombre una base de test/QA;
- recompila y valida el schema Prisma;
- resetea la base y aplica todas las migraciones;
- ejecuta el seed `demo` sin servicios externos;
- levanta una API temporal en un puerto libre;
- corre auth, onboarding, lifecycle, E2E real, account deletion y expiracion;
- detiene la API temporal tanto en PASS como en FAIL.

Seguridad:

- exige que el nombre de base contenga un segmento `test`, `tests` o `qa`;
- rechaza explicitamente nombres de desarrollo, staging y produccion, incluido `promy_db`;
- no existe bypass para desactivar esta proteccion;
- el provider de email `test` no realiza trafico externo y no puede activarse fuera de `APP_ENV=test`.

No la ejecutes contra produccion ni contra una base con datos que quieras preservar.

## Nota de entrega

No conviene incluir en un zip tecnico:

- `.env`
- `dist/`
- `server.log`
- `server.err.log`
- `.qa/`
- `*.log`
- `*.tsbuildinfo`

## Empaquetado local

Desde `C:\PROMY`, usar el empaquetador raiz:

```powershell
powershell -ExecutionPolicy Bypass -File .\pack-release.ps1
```

Eso arma un release limpio de `promy-api`, `promy-web`, `promy-landing` y `promy-mobile`, excluyendo secretos y artefactos locales.
