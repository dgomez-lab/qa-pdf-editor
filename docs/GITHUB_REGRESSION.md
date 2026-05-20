# GitHub Actions — regresión completa

Guía para ejecutar en remoto (sin usar tu máquina) la misma cobertura que un `allTests` en QAI Dogs: suite funcional + visual, excluyendo captura manual (`@MANUAL_SCREEN_CAPTURE`).

## Requisitos previos

1. Repositorio en GitHub con **Actions** habilitado.
2. Workflow [`.github/workflows/playwright.yml`](../.github/workflows/playwright.yml) visible en la pestaña **Actions**.
3. Baselines visuales en [`tests/visual/baseline/`](../tests/visual/baseline/) commiteados.
4. Acceso de red desde el runner a staging (MVPS puede exigir **allowlist de IP**; los runners de GitHub no son los mismos que AWS Dogs).

## Configuración en GitHub

### Automático (recomendado)

Con un [Personal Access Token](https://github.com/settings/tokens) (`repo` + acceso a secrets del repo) y `.env` rellenado (al menos Mailpit):

```bash
GH_TOKEN=ghp_xxxxxxxx npm run setup:github-actions
```

El script [`scripts/setup-github-actions-env.py`](../scripts/setup-github-actions-env.py) crea/actualiza secrets y variables en `dgomez-lab/qa-pdf-editor`. CRM, token MVPS y API key usan valores de `.env` si existen; si no, los mismos defaults que en `tests/helpers/*` (staging).

### Manual

**Settings → Secrets and variables → Actions**

### Variables (repository o environment)

| Variable | Descripción |
|----------|-------------|
| `PLAYWRIGHT_BASE_URL` | URL base opcional (si no usas solo `configuration.json` vía vars) |
| `PLAYWRIGHT_APP` | `mergedpdf` o `pdfhint` |
| `PLAYWRIGHT_MVPS_SLOT` | Slot `1`–`10` o vacío para `red` |
| `PLAYWRIGHT_PDFHINT_BASE_URL` | Marketing pdfhint |
| `PLAYWRIGHT_PDFHINT_APP_BASE_URL` | App pdfhint si difiere |
| `SEO_LOGIN_PATHNAME` | Login cabecera pdfhint (default `/login`) |

Si no defines variables, en CI se aplica [`config/configuration.json`](../config/configuration.json) (`environment: red`, `app: mergedpdf`). Los jobs fijan `APP=mergedpdf`.

### Job **ci-fast** (push / PR gate)

Solo `@PDFEDITOR_SEO` y `@PDFEDITOR_PDFHINT_SMOKE_SEO` (~5 tests). Sin dashboard ni pago. Mínimo: secret **`QAI_TOKEN_PARAM`** para MVPS.

### Secrets

| Secret | Uso |
|--------|-----|
| `QAI_TOKEN_PARAM` | Token QA en URLs MVPS |
| `PLAYWRIGHT_CRM_USER` / `PLAYWRIGHT_CRM_PASSWORD` | CRM staging |
| `PLAYWRIGHT_MAILPIT_USER` / `PLAYWRIGHT_MAILPIT_PASSWORD` | Emails transaccionales |
| `PLAYWRIGHT_QA_API_KEY` | API recurrencias |

Plantilla local: [`.env.example`](../.env.example).

El job **regression** activa además (sin secret): `PLAYWRIGHT_PAYMENT_SMOKE=1`, `PLAYWRIGHT_TRANSACTIONAL_PAYMENT_CONFIRMATION=1`, `PLAYWRIGHT_PDFHINT_DASHBOARD_SMOKE=1`.

## Lanzar la regresión (manual)

1. **Actions** → workflow **Playwright** → **Run workflow**.
2. Rama: `main` (o la rama a validar).
3. **profile:** `regression`.
4. Esperar **ci-fast** (gate rápido + parity tags) y luego **ci-regression** (hasta ~150 min).
5. Si falla o quieres revisar informes: artefacto **`playwright-report-regression`** (`playwright-report/`, `test-results/`, `cucumber-report/`).

### Perfiles del workflow

| profile | Jobs | Contenido |
|---------|------|-----------|
| `fast` | ci-fast | SEO + pdfhint SEO smoke + dashboard (PR/push por defecto) |
| `full` | ci-fast → ci-full | Funcional completo (sin visual) |
| `visual` | ci-visual | Solo `@PDFEDITOR_VISUAL*` |
| `regression` | ci-fast → ci-regression | Funcional (`--grep-invert @MANUAL_SCREEN_CAPTURE`) + visual |

## Disparo automático en pull requests

Cada **pull request** hacia `main` o `master` ejecuta:

1. **ci-fast** — SEO + smoke pdfhint SEO (~15 min máx.).
2. **ci-regression** — regresión completa tras pasar ci-fast (hasta ~150 min).

Los **push** directos a `main`/`master` siguen ejecutando solo **ci-fast** (sin regresión completa), para no alargar cada merge.

Los PR desde **forks** no reciben secrets del repo base; la regresión puede fallar o omitir escenarios que requieran credenciales hasta merge en una rama del mismo repo.

## Comandos locales equivalentes

```bash
npm run test:ci-regression
```

Equivale a `bddgen` + funcional sin captura manual + visual con snapshots.

## CLI (opcional)

Con `gh` autenticado y secrets/vars ya configurados en el repo:

```bash
gh workflow run playwright.yml -f profile=regression --ref main
gh run list --workflow=playwright.yml --limit 3
```

## Qué no incluye la regresión CI

- [`features/VisualCapture.feature`](../features/VisualCapture.feature) (`@MANUAL_SCREEN_CAPTURE`) — solo local para renovar PNG de referencia.
- Escenarios multi-formato sin `tests/fixtures/sample.<ext>` — hacen `test.skip` (ver [`tests/helpers/multiFormatUpload.ts`](../tests/helpers/multiFormatUpload.ts)).

## Primera ejecución — checklist

- [ ] Variables y secrets configurados (tablas arriba).
- [ ] `gh workflow run … profile=regression` o Run workflow en la UI.
- [ ] Revisar logs: `bddgen` y recuento de tests.
- [ ] Si timeouts masivos en `*.mvps.website`: allowlist GitHub Actions o runner self-hosted.
- [ ] Descargar artefacto y abrir `cucumber-report/index.html` o trace en `test-results/`.
