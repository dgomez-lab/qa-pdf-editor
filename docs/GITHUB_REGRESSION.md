# GitHub Actions — regresión completa

Guía para ejecutar en remoto (sin usar tu máquina) la misma cobertura que un `allTests` en QAI Dogs: suite funcional + visual, excluyendo captura manual (`@MANUAL_SCREEN_CAPTURE`).

## Cómo leer varias ejecuciones seguidas

| Run | Commit | Evento | Qué esperar |
|-----|--------|--------|-------------|
| Antes de `ac33d95` (p. ej. `4439503`) | Viejo workflow | `workflow_dispatch` / push | **ci-fast** ~24 min y fallo (dashboard + `/en/login`). **ci-regression** no corre (0s) porque fast falló o el perfil no existía. **Ignorar.** |
| `ac33d95`+ push a `main` | Actions | `push` | Solo **ci-fast** (~1 min). |
| `profile: regression` (manual) | `workflow_dispatch` | **regression-setup-dispatch** en paralelo con **ci-fast** → **8 shards funcionales** + **2 shards visuales** → informe. |
| PR a `main` | `pull_request` | **ci-fast** → **regression-setup** → **8 + 2 shards** en paralelo. |

Si lanzaste **regression** dos veces antes del push, ambas usaron el workflow antiguo: solo cuenta la ejecución sobre **`ac33d95` o posterior**.

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

Los jobs de regresión activan además (sin secret): `PLAYWRIGHT_PAYMENT_SMOKE=1`, `PLAYWRIGHT_TRANSACTIONAL_PAYMENT_CONFIRMATION=1`, `PLAYWRIGHT_PDFHINT_DASHBOARD_SMOKE=1`.

## Tamaño de la suite (214 tests)

Tras `npm run bddgen`, la regresión CI cubre **214 tests** automáticos:

| Parte | Filtro | Tests |
|-------|--------|------:|
| Funcional | `--grep-invert "@MANUAL_SCREEN_CAPTURE\|@PDFEDITOR_VISUAL"` | 146 |
| Visual | `--grep @PDFEDITOR_VISUAL` | 68 |
| **Total** | | **214** |

Los shards funcionales **no** ejecutan los visuales (evita duplicar ~68 tests en cada shard). El informe fusiona **10 artefactos** (8 funcionales + 2 visuales).

## Paralelismo (8 + 2 shards, estilo QAI Dogs)

La regresión no usa un solo runner de 3 h:

1. **regression-setup** (PR: tras **ci-fast**) o **regression-setup-dispatch** (manual: en paralelo con **ci-fast**) — `bddgen` una vez, artefacto `features-gen` (`include-hidden-files: true` en el upload).
2. **ci-regression-functional** — matriz **8 jobs** (`--shard=1/8` … `8/8`), ~18 tests/shard, **2 workers** (`PLAYWRIGHT_CI_WORKERS=2`), **1 reintento** en CI (`PLAYWRIGHT_CI_RETRIES=1`).
3. **ci-regression-visual** — matriz **2 jobs** (`--shard=1/2` y `2/2`), ~34 tests/shard.

Tiempo de pared ≈ `max(shard funcional más lento, shard visual más lento)`. En runners gratuitos de GitHub suele ser **~40–55 min** si no hay timeouts; **30–40 min** como QAI Dogs (5 máquinas AWS) suele requerir runners self-hosted más cerca de staging.

Si **regression-setup** falla con *No files were found* al subir el artefacto, comprueba que existan `*.spec.js` bajo `.features-gen/` tras `bddgen` y que el paso de upload tenga `include-hidden-files: true`.

Si hay flakes en pago/Mailpit, baja workers en el workflow: `PLAYWRIGHT_CI_WORKERS: '1'`.

## Lanzar la regresión (manual)

1. **Actions** → workflow **Playwright** → **Run workflow**.
2. Rama: `main` (o la rama a validar).
3. **profile:** `regression`.
4. En manual: **regression-setup-dispatch** y shards arrancan sin esperar a **ci-fast**. En PR: **ci-fast** → **regression-setup** → shards.
5. Esperar **8× functional** + **2× visual** → **Publish regression report**.
6. Abrir el informe desde el **job summary** del job **Publish regression report** (enlace al dashboard) o la URL de GitHub Pages (abajo).

## Informe QAI-style (GitHub Pages)

Tras cada regresión (PR o `profile: regression`), el job **Publish regression report** fusiona los **10** fragmentos NDJSON y publica un dashboard HTML (cuadrícula, passed/failed/skipped, pasos Gherkin, capturas en fallos). El merge deduce **PASSED/FAILED** desde los pasos Gherkin cuando playwright-bdd no envía `testCaseResult` en `testCaseFinished`.

### Activar GitHub Pages (una vez)

1. **Settings** → **Pages** → **Build and deployment** → Source: **Deploy from a branch**.
2. Branch: **`gh-pages`** / folder **`/(root)`** (el workflow `peaceiris/actions-gh-pages` crea/actualiza esa rama en el primer despliegue).
3. El repo es **público**: las capturas de fallo pueden mostrar UI de staging (CRM, pago). Valora privacidad antes de compartir la URL.

### URL del informe

```
https://<owner>.github.io/<repo>/runs/<run_id>/
```

Ejemplo: `https://dgomez-lab.github.io/qa-pdf-editor/runs/26161124410/`

También aparece en el **Summary** del workflow (pestaña del run en Actions) tras **Publish regression report**.

### Qué incluye el dashboard

| Elemento | Descripción |
|----------|-------------|
| Barra de progreso | % completado, total / passed / failed / skipped / incomplete |
| Aviso partial | `N reported, 214 expected` si faltan shards |
| Cuadrícula | Un cuadrado por escenario (color por estado); clic abre detalle |
| Detalle | Pasos Given/When/Then con estado y mensaje de error |
| Playwright HTML | Enlace a traces/vídeo/screenshots (fusión de blobs; omitida si supera ~500 MB) |

### Artefactos por shard (depuración)

Cada shard sube siempre (aunque pase):

| Artefacto | Contenido |
|-----------|-----------|
| `cucumber-messages-shard-N` | `messages.ndjson` (fusionable) |
| `blob-report-shard-N` | Blobs Playwright para traces |
| `cucumber-messages-visual-1` … `visual-2` | Visual sharded |
| `blob-report-visual-1` … `visual-2` | Blobs visual |

Ya no se suben informes HTML de 1+ GB por shard. En CI, `messages.ndjson` usa `skipAttachments: true` (tamaño típico: pocos MB, no GB).

### Solución de problemas (informe no publicado)

Si el job **Publish regression report** falla o no hay enlace al dashboard:

| Síntoma | Causa habitual | Qué hacer |
|---------|----------------|-----------|
| Paso **Merge cucumber messages** en rojo | `messages.ndjson` de varios GB (capturas embebidas en runs antiguos) o OOM al fusionar | Usar commit con `skipAttachments: true`; el merge actual ignora adjuntos y parsea por streaming |
| **Deploy** en rojo, merge en verde | GitHub Pages no activado | **Settings → Pages → Deploy from branch → `gh-pages` / (root)** |
| Dashboard **106 total, 0 passed** | Run parcial + merge antiguo sin inferir estado desde pasos | Re-ejecutar con commit actual; debe mostrar **~214** y passed/failed > 0 |
| Dashboard con **Partial run** | Menos de **10/10** artefactos con datos (timeout/cancelación) | Revisar shards; no lanzar dos regresiones a la vez en la misma rama |
| Workflow **Cancelled** con otro run en curso | `concurrency: cancel-in-progress: true` | Esperar al run anterior o usar otra rama |
| Artefacto `cucumber-messages-*` de **146 B** | Job cancelado/timeout antes de tests | No aporta al informe |

Ejemplo de run incompleto: [26185775854](https://github.com/dgomez-lab/qa-pdf-editor/actions/runs/26185775854) — 3/7 artefactos, 106 tests, 0% progreso (timeouts 2 h + cancelación).

### Fusionar informes en local

```bash
mkdir -p artifacts/cucumber-messages-shard-1
cp cucumber-report/messages.ndjson artifacts/cucumber-messages-shard-1/
npm run report:merge-local
# Abre report/index.html (o report-local si usas REPORT_OUTPUT_DIR)
```

### Perfiles del workflow

| profile | Jobs | Contenido |
|---------|------|-----------|
| `fast` | ci-fast | SEO + pdfhint SEO smoke (PR/push por defecto) |
| `full` | ci-fast → ci-full | Funcional completo en un runner (sin visual) |
| `visual` | ci-visual | Solo `@PDFEDITOR_VISUAL*` (manual) |
| `regression` | setup (PR: tras fast; manual: dispatch) → 8 + 2 shards | Regresión completa paralela |

## Disparo automático en pull requests

Cada **pull request** hacia `main` o `master` ejecuta **ci-fast** y luego la regresión paralela (8 shards + 2 visual).

Los **push** a `main`/`master` ejecutan solo **ci-fast** (smoke SEO). La regresión completa no corre en push; valida en el PR antes del merge o con **Run workflow** → profile **`regression`**.

Los PR desde **forks** no reciben secrets del repo base.

## Comandos locales equivalentes

```bash
npm run test:ci-regression
```

Regresión completa en un solo proceso (sin sharding).

Depurar un shard:

```bash
npm run bddgen
npm run test:ci-regression-functional-shard -- --shard=1/8 --list
npm run test:ci-regression-functional-shard -- --shard=1/8
npm run test:ci-regression-visual-shard -- --shard=1/2 --list
```

Verificar merge del informe (fixture local):

```bash
npm run report:verify-merge
```

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
- [ ] GitHub Pages activado (**Settings → Pages → branch `gh-pages` / root**).
- [ ] Tras el run: job **Publish regression report** en verde; enlace en **Summary**.
- [ ] URL: `https://<owner>.github.io/<repo>/runs/<run_id>/`.
