# Runner Playwright: configuracion y diagnostico

Esta guia resume el comportamiento centralizado en
[`playwright.config.ts`](../playwright.config.ts). Usala cuando un spec funciona
distinto entre local, UI Mode y GitHub Actions, o cuando necesites depurar
timeouts, trazas y snapshots.

## Carga de variables de entorno

La configuracion carga `.env` y despues `.env.local` antes de resolver
`baseURL`. La regla importante es que no sobrescribe valores ya definidos:

1. Variables exportadas en el shell o inyectadas por CI.
2. Valores de `.env`.
3. Valores de `.env.local` solo si la clave no existe todavia.

El parser es intencionalmente simple: acepta lineas `CLAVE=valor`, ignora lineas
vacias o que empiezan por `#`, y quita comillas simples o dobles que envuelvan
todo el valor. No expande referencias entre variables.

Ejemplo local:

```bash
APP=mergedpdf
MVPS_SLOT=2
HEADLESS=0
SLOWMO=150
```

Para valores sensibles, preferid exportarlos en el shell o usar secretos de CI.

## Resolucion de `baseURL`

La URL base se resuelve con
[`playwright/resolveBaseUrl.ts`](../playwright/resolveBaseUrl.ts) y despues se
asigna a `process.env.BASE_URL` cuando no venia definida. Esto mantiene alineados
los helpers que leen `BASE_URL` con la `baseURL` real de Playwright.

Resumen operativo:

| Caso | Resultado |
|------|-----------|
| `BASE_URL=https://...` | Control total; se normalizan barras finales. |
| `BASE_URL` con host `*.mvps.website` y query | El origen queda sin query y el query pasa a `QAI_TOKEN_PARAM` si no estaba definido. |
| `APP=pdfhint` | `https://staging.pdfhint.com` o `PDFHINT_BASE_URL`. |
| `APP=mergedpdf` / `APP=mvps` | `https://red.mvps.website` o `redN` segun `MVPS_SLOT` / `ENVIRONMENT`. |
| `APP` vacio en GitHub Actions | Default `mergedpdf`. |
| `APP` vacio fuera de GitHub Actions | Default `pdfhint`. |

En MVPS, las navegaciones marketing deben pasar por
[`gotoMarketingPath`](../tests/helpers/mvpsUrl.ts) o
[`ensureMvpsMarketingUrl`](../tests/helpers/mvpsUrl.ts) para conservar el token
QA. Playwright no conserva el query de `baseURL` al resolver rutas como
`page.goto('/forms')`.

En pdfhint, las rutas autenticadas (`/en/login`, `/dashboard`, `/account`,
`/settings`) usan el host `app.*`. Para esas rutas, usad
[`appUrl(path)`](../tests/helpers/appUrl.ts). Las rutas publicas de marketing
siguen usando la `baseURL` principal.

## Depuracion local

| Variable | Efecto |
|----------|--------|
| `HEADLESS=0` / `false` / `no` / `off` | Ejecuta Chromium visible. |
| `HEADLESS=1` / `true` / `yes` / `on` | Ejecuta headless. Es el default. |
| `SLOWMO=250` | Ralentiza cada accion de Playwright en milisegundos. |
| `PLAYWRIGHT_TRACE=1` | Fuerza trazas en todos los tests. |

Comandos utiles:

```bash
HEADLESS=0 SLOWMO=150 npm run test:tag -- @PDFEDITOR_SMOKE_HOME
PLAYWRIGHT_TRACE=1 npm run test:tag -- @PDFEDITOR_PDFHINT_SMOKE_SEO
npm run test:ui
```

UI Mode activa trazas automaticamente para poblar las pestañas Actions, Network,
Console y Source.

## Timeouts, reintentos y artefactos

| Ajuste | Valor |
|--------|-------|
| Timeout por test | 180 s |
| Timeout de `expect` | 30 s |
| Timeout de navegacion | 90 s |
| Timeout de accion | 45 s |
| Proyecto Playwright | Chromium desktop |
| Paralelismo | `fullyParallel: true` |
| Reintentos en CI | 2 |
| Workers en CI | 2 |
| `test.only` en CI | Bloqueado con `forbidOnly` |
| Trace CLI normal | `on-first-retry` |
| Screenshots | Solo al fallar |
| Video | Retenido al fallar |

Las comparaciones visuales usan `toHaveScreenshot` con animaciones desactivadas,
escala CSS y `maxDiffPixels: 2500`. Para regenerar baselines visuales, usa los
scripts `test:visual-update*` documentados en el README.

## CI de GitHub Actions

El workflow
[`Playwright`](../.github/workflows/playwright.yml) instala dependencias con
`npm ci`, instala Chromium con dependencias del sistema, ejecuta paridad de tags
y despues lanza una de estas suites:

| Perfil | Comando | Activacion |
|--------|---------|------------|
| `fast` | `npm run test:ci-fast` | `push`, `pull_request`, o `workflow_dispatch` default. |
| `full` | `npm run test:ci-full` | `workflow_dispatch` con `profile=full`, tras `ci-fast`. |
| `visual` | `npm run test:ci-visual` | `workflow_dispatch` con `profile=visual`. |

En Actions, `npm run porting:tags` se ejecuta con
`SKIP_LEGACY_TAG_CHECK=1` porque el repositorio legacy no se clona. En local,
para una comprobacion completa, clona `qai-pa-pdf-editor` junto a este repo o
define `LEGACY_REPO=/ruta/al/legacy` y ejecuta `npm run porting:tags` sin ese
skip.

Los reportes `playwright-report/` y `test-results/` se suben como artefactos
solo si falla el job.
