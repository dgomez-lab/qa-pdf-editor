# qa-pdf-editor

Suite E2E del editor PDF en **Playwright + TypeScript**, migrada desde el proyecto Bitbucket **qai-pa-pdf-editor** (Cucumber + Selenium + `qai-pa-core`).

## Requisitos

- Node.js 20+
- Red saliente al entorno bajo prueba. El pipeline Bitbucket original asume **allowlist de IP**; en GitHub Actions puede hacer falta un runner con acceso similar.

## Instalación

```bash
npm ci
npx playwright install chromium
```

## Configuración local (`config/configuration.json`)

Paridad con **`qai-pa-pdf-editor/config/configuration.json`**. Edita el JSON y ejecuta `npm test`; no hace falta exportar variables en cada comando.

| Campo JSON | Efecto |
|------------|--------|
| `driver.headless` | `true` / `false` → navegador headless o visible |
| `logLevel` | `DEBUG` / `INFO` / `SILENT` → `BDD_LOG_LEVEL` |
| `projectVars.environment` | `red`, `red1`, `red2`, … `red10` → `ENVIRONMENT` (URL MVPS + CRM) |
| `projectVars.app` | `mergedpdf` o `pdfhint` → `APP` |
| `projectVars.baseUrl` | URL fija → `BASE_URL` (pdfhint staging, local, etc.) |
| `projectVars.appendQaToken` | `false` en pdfhint (sin token QA en marketing) |

**Perfiles** (como en legacy):

- Por defecto: [`config/configuration.json`](config/configuration.json) — `app: mergedpdf`, `environment: red`.
- Pdfhint: `QAI_PA_CONFIGURATION_PATH=config/configuration.pdfhint.json` o `npm run test:pdfhint-smoke` / `npm run test:pdfhint-tag -- @TAG`. Los escenarios en `PDFhint.feature` llevan `@PDFHINT` (URL `staging.pdfhint.com`, sin token QA, prefijo Mailpit `pdfhint`) vía hooks en `tests/bdd/steps/hooks.steps.ts`.
- Plantilla: [`config/configurationExample.json`](config/configurationExample.json) (p. ej. `red2` + `headless: false`).

**Una sola fuente:** headless, `environment`, `app`, `baseUrl`, `logLevel` y `SLOWMO` (vía `timeouts.stepWaiter`) **solo** en `configuration.json`. El `.env` es para secretos (CRM, Mailpit) y flags como `PLAYWRIGHT_PAYMENT_SMOKE`.

| Quieres | Qué hacer |
|---------|-----------|
| Sin ventana de Chrome | `"headless": true` en JSON y **no** uses `--headed` en el comando |
| Ver el navegador | `"headless": false` en JSON y **no** uses `--headed` |

`npx playwright test --headed` **siempre** abre ventana visible y **ignora** `driver.headless` del JSON (comportamiento de Playwright). Usa solo `npm run test:tag -- @TAG` y edita el JSON.

Ejemplo — probar **red2** con navegador visible:

```json
{
  "driver": { "headless": false },
  "projectVars": { "environment": "red2", "app": "mergedpdf", "baseUrl": "" }
}
```

## URL base (alineado con `ProjectData.getUrl` / `configuration.pdfhint`)

La resolución está en [`playwright/resolveBaseUrl.ts`](playwright/resolveBaseUrl.ts) y se usa en [`playwright.config.ts`](playwright.config.ts). Si no defines `BASE_URL`, se elige el destino con **`APP`**:

| Objetivo | Variables | URL resultante |
|----------|-------------|----------------|
| **pdfhint** staging (por defecto) | `APP=pdfhint` o omitir `APP` | `https://staging.pdfhint.com` (override con `PDFHINT_BASE_URL`) |
| **mergedpdf** stage / dinámicos | `APP=mergedpdf` o `APP=mvps` | `https://red.mvps.website` (origen **sin** query; el token `x-token-qa` se añade en cada navegación vía [`tests/helpers/mvpsUrl.ts`](tests/helpers/mvpsUrl.ts)) |
| Slot **red1…red10** | `APP=mergedpdf` + `MVPS_SLOT=1` … `10` | `https://red1.mvps.website` (+ token en cada `goto`) |
| Igual que `projectVars.environment` | `ENVIRONMENT=red3` | `https://red3.mvps.website` (+ token en cada `goto`) |
| Control total | `BASE_URL=https://...` | Si es `*.mvps.website` **con** `?x-token-qa=…`, el host se normaliza y el query pasa a `QAI_TOKEN_PARAM` (Playwright pierde el query del `baseURL` al resolver rutas absolutas `/ruta`). |

Parámetros opcionales:

- `QAI_TOKEN_PARAM` — query del token QA (por defecto `x-token-qa=niGqCYH7McqERAB`). Si `BASE_URL` ya trae `?x-token-qa=…`, se reutiliza al normalizar el host.
- `APPEND_QA_TOKEN=false` — no añadir token en [`gotoMarketingPath`](tests/helpers/mvpsUrl.ts) (casos excepcionales).
- Tras resolver, se asigna `process.env.BASE_URL` para que helpers como `isPdfhintSite()` coincidan con el `baseURL` de Playwright.

Ejemplos:

```bash
APP=mergedpdf MVPS_SLOT= npm test
APP=mergedpdf MVPS_SLOT=2 npm test
BASE_URL='https://red.mvps.website/?x-token-qa=niGqCYH7McqERAB' npm test
```

## Tags (paridad con Cucumber)

Los tests llevan `tag:` con el mismo estilo `@PDFEDITOR_...` que en Gherkin. Ejemplos:

```bash
npm run test:tag -- @PDFEDITOR_PDFHINT_SMOKE_SEO
npm run test:tag -- @PDFEDITOR_SEO_HOME_HEADER_ABSOLUTE_HREFS
PLAYWRIGHT_PAYMENT_SMOKE=1 npm run test:tag -- @PDFEDITOR_PDFHINT_SMOKE_VISA
```

(`npm run test:grep` es alias de `test:tag`.)

## Otras variables

| Variable | Descripción |
|----------|-------------|
| `PLAYWRIGHT_PAYMENT_SMOKE` | `1` / `true` para ejecutar escenarios de pago (tags `@PDFEDITOR_PAYMENT_*` y smoke de pago). |
| `PLAYWRIGHT_TEST_EMAIL` | Email fijo para el test de pago. |
| `STRIPE_TEST_CARD_NUMBER` / `EXP` / `CVC` | Tarjeta de prueba Stripe (por defecto 4242… / 1234 / 123). |
| `SEO_LOGIN_PATHNAME` | Pathname esperado del Login en marketing pdfhint (por defecto `/login`; `@PDFHINT` lo fija si falta). |
| `PLAYWRIGHT_TRACE` | `1` fuerza `trace: 'on'` en toda la suite (útil para depurar Stripe). |
| `BDD_LOG_LEVEL` | Por defecto **local:** `DEBUG` (logs de página/elemento estilo legacy). **CI:** `INFO`. Override: `SILENT` / `INFO` / `DEBUG`. |
| `BDD_TERMINAL_STEPS` | Por defecto **local:** `✔`/`✖` por paso Gherkin en terminal. **CI:** desactivado. Desactivar local: `BDD_TERMINAL_STEPS=0`. |

En GitHub: variable `PLAYWRIGHT_BASE_URL` y, si aplica, `PLAYWRIGHT_APP` / `MVPS_SLOT` (ver workflow). El job **Tag parity** (`npm run porting:tags`) en Actions usa `SKIP_LEGACY_TAG_CHECK=1` porque no se clona `qai-pa-pdf-editor`; en local, con `../qai-pa-pdf-editor`, ejecuta `npm run porting:tags` sin esa variable para la comprobación completa.

## Regresión completa en GitHub (manual)

Equivalente remoto a un `allTests` en QAI Dogs: un solo disparo con suite funcional + visual, sin usar tu PC.

1. Configura **variables** y **secrets** en el repo (tablas en [docs/GITHUB_REGRESSION.md](docs/GITHUB_REGRESSION.md); plantilla [`.env.example`](.env.example)).
2. **Actions** → **Playwright** → **Run workflow** → profile **`regression`**.
3. Tras **ci-fast**, el job **ci-regression** ejecuta `npm run test:ci-regression` (excluye `@MANUAL_SCREEN_CAPTURE`, incluye `@PDFEDITOR_VISUAL*`).
4. Informes: artefacto **`playwright-report-regression`** (`cucumber-report/index.html`, Playwright HTML, traces).

Cada **PR** hacia `main`/`master` ejecuta **fast** y luego **regression** (funcional + visual). Push a `main` solo ejecuta **fast** (~1 min). Regresión completa: **Actions → Run workflow → `regression`** o abrir un PR. Ejecuciones en commits anteriores a `ac33d95` usaban el workflow antiguo (fallos de 24 min) — ver [docs/GITHUB_REGRESSION.md](docs/GITHUB_REGRESSION.md).

Si staging exige allowlist de IP, los runners `ubuntu-latest` de GitHub pueden necesitar excepción en infra o un runner self-hosted (ver [docs/GITHUB_REGRESSION.md](docs/GITHUB_REGRESSION.md)).

```bash
gh workflow run playwright.yml -f profile=regression --ref main
```

## Scripts

| Comando | Uso |
|---------|-----|
| `npm run bddgen` | Genera tests Playwright desde `features/**/*.feature` en `.features-gen/`. |
| `npm test` | Ejecuta `bddgen` y luego toda la suite Playwright-BDD. |
| `npm run test:tag -- @TAG` | Ejecuta por tag (`@PDFEDITOR_*`) sobre escenarios BDD. |
| `npm run test:pdfhint-smoke` | Pdfhint (`configuration.pdfhint.json`) + tags `@PDFEDITOR_PDFHINT_SMOKE*` (hook `@PDFHINT` en el feature). |
| `npm run sync:legacy-elements` | Copia selectores desde `../qai-pa-pdf-editor` a `tests/bdd/legacy-elements/`. |
| `npm run test:pdfhint-tag -- @TAG` | Igual con perfil pdfhint y tag arbitrario. |
| `npm run test:ci-fast` | Gate rápido CI: SEO mergedpdf + smoke SEO pdfhint (sin dashboard/pago). |
| `npm run test:ci-full` | Suite funcional CI (excluye `@MANUAL_SCREEN_CAPTURE`). |
| `npm run test:ci-regression` | Funcional + visual (`@PDFEDITOR_VISUAL*`) para regresión GitHub. |
| `npm run test:ci-visual` | Solo visual por tag `@PDFEDITOR_VISUAL*`. |
| `npm run typecheck` | Verificación TypeScript (`tsc --noEmit`). |
| `npm run porting:stats` | Estadísticas de escenarios/tags vendored en `features/`. |
| `npm run porting:tags` | Comparador de tags legacy vs vendored/generated. |
| `npm run test:report` | Abre el informe Cucumber HTML (`cucumber-report/index.html`) con estado por paso Gherkin. |

## Depuración y informes de fallo

Tras ejecutar tests, puedes ver **qué paso Gherkin falló** en:

| Salida | Ruta / comando |
|--------|----------------|
| Cucumber HTML (recomendado, paridad con resumen legacy) | `npm run test:report` → `cucumber-report/index.html` |
| Playwright HTML | `npx playwright show-report` |
| Contexto del fallo (snapshot de accesibilidad) | `test-results/**/error-context.md` |
| Screenshot / video | `test-results/**/` |

Logs en consola (activos por defecto en local con `npm test` / `npm run test:tag`):

```bash
npm run test:tag -- @PDFEDITOR_PAYMENT_FIRST_VISA
# Silenciar en local:
BDD_LOG_LEVEL=SILENT BDD_TERMINAL_STEPS=0 npm run test:tag -- @TAG
```

## Documentación de migración

- [docs/MIGRATION_INVENTORY.md](docs/MIGRATION_INVENTORY.md) — inventario del repo Cucumber/Selenium.
- [docs/PORTING_STATUS.md](docs/PORTING_STATUS.md) — escenarios por feature y estado del port.
- [docs/ADDING_PLAYWRIGHT_TESTS.md](docs/ADDING_PLAYWRIGHT_TESTS.md) — **cómo añadir escenarios** (Gherkin, pasos BDD, tags, `bddgen`).

## Paridad con Bitbucket (resumen)

- **Tag parity: 215/215 (100%)** — verificable con `npm run porting:tags` (`missingFromPlaywright: []`). Los mismos `.feature` del legacy están en [`features/`](features/) (vendored).
- 9 features Cucumber portadas vía Playwright-BDD: SEO, PDFhint, Users, Dashboard, FirstPayment (refund, IP, UTM, cancel), TransactionalEmails (Mailpit), Recurrences, Visual + VisualCapture documentado.
- Pago Stripe: helper [`tests/helpers/stripePayment.ts`](tests/helpers/stripePayment.ts) (unificado, `#payment-element`, split, recorrido de frames `stripe.com`).
- CRM staging: helpers [`tests/helpers/crmStaging.ts`](tests/helpers/crmStaging.ts) con `refund`, `unsubscribe`, `blockCustomer`, `confirmSubscriptionCancellation`, `expectLastTransactionMatches`.
- Mailpit: helpers [`tests/helpers/mailpitClient.ts`](tests/helpers/mailpitClient.ts) con polling por search/subject/locale, `extractDownloadCode`, `extractFirstHttpsUrl`.
- Escenarios BDD ejecutan contra staging real cuando se exportan las credenciales; sin ellas, `test.skip` con motivo claro (no ruido en CI).

## Estructura

```
features/                    # Gherkin vendored (9 .feature) — fuente de escenarios
.features-gen/               # Tests generados por bddgen (gitignored)
playwright/
  resolveBaseUrl.ts          # red / redN + token vs pdfhint
scripts/
  porting-parity-stats.mjs   # Estadísticas Gherkin
  porting-tags.mjs           # Comparador de tags legacy vs features/.features-gen
tests/
  bdd/
    fixtures.ts              # createBdd + world
    steps/                   # Given/When/Then (core, hooks, data)
    legacy-elements/         # elements.json heredados del POM Selenium
  helpers/                   # stripePayment, crmStaging, mailpitClient, navigation, ...
  pages/                     # POM TypeScript + elements.json
  visual/baseline/           # PNG de regresión visual (@PDFEDITOR_VISUAL*)
  fixtures/                  # sample.pdf (+ otros formatos vía PLAYWRIGHT_FIXTURE_<FORMAT>)
```
