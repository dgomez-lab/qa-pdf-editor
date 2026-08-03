# Runner Playwright: configuración y diagnóstico

Comportamiento centralizado en [`playwright.config.ts`](../playwright.config.ts). Usa esta guía cuando un escenario se comporta distinto entre local, UI Mode y GitHub Actions, o para depurar timeouts, trazas y snapshots.

## Carga de variables

Orden al arrancar Playwright:

1. Variables ya definidas en el shell o inyectadas por CI (prioridad máxima).
2. [`.env`](../.env.example) — solo claves que **aún no** existen en `process.env`.
3. `.env.local` — misma regla (no sobrescribe).
4. [`loadConfiguration()`](../playwright/loadConfiguration.ts) — aplica `config/configuration.json` (o `QAI_PA_CONFIGURATION_PATH`).

El parser de `.env` es simple: `CLAVE=valor`, ignora vacías/`#`, y quita comillas que envuelvan el valor. **No** expande referencias entre variables.

Claves de runtime de app/URL (`HEADLESS`, `ENVIRONMENT`, `MVPS_SLOT`, `APP`, `BASE_URL`, `SLOWMO`, `BDD_LOG_LEVEL`, `APPEND_QA_TOKEN`, …) están en `CONFIGURATION_JSON_ENV_KEYS`: el loader de `.env` **las ignora**. Deben vivir en `configuration.json` (o exportarse en el shell / CI antes de arrancar). El `.env` queda para secretos (CRM, Mailpit) y flags (`PLAYWRIGHT_PAYMENT_SMOKE`, …).

## Resolución de `baseURL`

[`playwright/resolveBaseUrl.ts`](../playwright/resolveBaseUrl.ts) resuelve la URL y, si `BASE_URL` no venía definida, la escribe en `process.env.BASE_URL` para alinear helpers con Playwright.

| Caso | Resultado |
|------|-----------|
| `BASE_URL=https://…` | Control total; se normalizan barras finales. |
| `BASE_URL` con host `*.mvps.website` y query | Origen sin query; el query pasa a `QAI_TOKEN_PARAM` si no estaba definido. |
| `APP=pdfhint` | `https://staging.pdfhint.com` o `PDFHINT_BASE_URL`. |
| `APP=mergedpdf` / `APP=mvps` | `https://red.mvps.website` o `redN` según `MVPS_SLOT` / `ENVIRONMENT`. |
| `APP` vacío en GitHub Actions | Default `mergedpdf`. |
| `APP` vacío fuera de GitHub Actions | Default `pdfhint`. |

En MVPS, navega con [`gotoMarketingPath`](../tests/helpers/mvpsUrl.ts): Playwright no conserva el query de `baseURL` al resolver rutas absolutas (`/forms`). En pdfhint, rutas autenticadas usan el host `app.*` vía [`appUrl`](../tests/helpers/appUrl.ts).

## Depuración local

| Variable / flag | Efecto |
|-----------------|--------|
| `"headless": false` en JSON (o `HEADLESS=0` en shell) | Chromium visible |
| `SLOWMO` (vía `timeouts.stepWaiter` en JSON) | Ralentiza cada acción (ms) |
| `PLAYWRIGHT_TRACE=1` | Trace siempre `on` |
| `npx playwright test --headed` | Fuerza ventana visible e **ignora** `driver.headless` del JSON |

```bash
# Edita config/configuration.json → headless: false, environment: red2
npm run test:tag -- @PDFEDITOR_SEO_HOME_HEADER_ABSOLUTE_HREFS
PLAYWRIGHT_TRACE=1 npm run test:tag -- @PDFEDITOR_PDFHINT_SMOKE_SEO
npm run test:ui
```

UI Mode (`PWTEST_TEST_UI_MODE=1`) activa traces para Actions/Network/Console/Source.

## Timeouts, reintentos y artefactos

| Ajuste | Valor |
|--------|-------|
| Timeout por test | 180 s |
| Timeout de `expect` | 30 s |
| Timeout de navegación / acción | 90 s / 45 s |
| Proyecto | Chromium desktop |
| Paralelismo | `fullyParallel: true` |
| Reintentos locales | 0 |
| Reintentos en CI | `PLAYWRIGHT_CI_RETRIES` si está definido; si no, **1** |
| Workers en CI | `PLAYWRIGHT_CI_WORKERS` (default **2**; shards de regresión usan **1**) |
| `test.only` en CI | Bloqueado (`forbidOnly`) |
| Trace | `on-first-retry` (o `on` con `PLAYWRIGHT_TRACE=1` / UI Mode) |
| Screenshots | Solo al fallar |
| Video | Local: `retain-on-failure`; CI: `off` |

Snapshots visuales: `toHaveScreenshot` con animaciones off, escala CSS, `maxDiffPixels: 2500`, baselines en `tests/visual/baseline/`.

## CI de GitHub Actions

Workflow [`.github/workflows/playwright.yml`](../.github/workflows/playwright.yml):

| Perfil | Contenido | Activación |
|--------|-----------|------------|
| `fast` | `@PDFEDITOR_SEO` (`PLAYWRIGHT_CI_RETRIES=2`) | push, PR, o dispatch `fast` |
| `full` | Funcional sin visual | dispatch `full` (tras ci-fast) |
| `visual` | `@PDFEDITOR_VISUAL*` | dispatch `visual` |
| `regression` | 14 shards funcionales + 4 visuales → informe → gate | PR automático o dispatch `regression` |

`npm run porting:tags` en Actions usa `SKIP_LEGACY_TAG_CHECK=1` (no se clona el legacy). En local, con `../qai-pa-pdf-editor` o `LEGACY_REPO`, ejecuta sin ese skip.

Unit tests de helpers/scripts (sin browser BDD): `npm run test:unit` → [`playwright.unit.config.ts`](../playwright.unit.config.ts).

Runbook de regresión, Mailpit/VPN y artefactos: [GITHUB_REGRESSION.md](GITHUB_REGRESSION.md).
