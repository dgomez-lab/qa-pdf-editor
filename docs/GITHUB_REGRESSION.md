# GitHub Actions — regresión completa

Guía para ejecutar en remoto (sin usar tu máquina) la misma cobertura que un `allTests` en QAI Dogs: suite funcional + visual, excluyendo captura manual (`@MANUAL_SCREEN_CAPTURE`).

## Cómo leer varias ejecuciones seguidas

| Run | Commit | Evento | Qué esperar |
|-----|--------|--------|-------------|
| Antes de `ac33d95` (p. ej. `4439503`) | Viejo workflow | `workflow_dispatch` / push | **ci-fast** ~24 min y fallo (dashboard + `/en/login`). **ci-regression** no corre (0s) porque fast falló o el perfil no existía. **Ignorar.** |
| `ac33d95`+ push a `main` | Actions | `push` | Solo **ci-fast** (~1 min). |
| `profile: regression` (manual) | `workflow_dispatch` | **regression-setup-dispatch** → **14 shards funcionales** + **4 shards visuales** (timeout 40 min/shard) → informe. |
| PR a `main` | `pull_request` | **ci-fast** (paralelo) + **regression-setup** → **14 + 4 shards** → **Publish regression report** → **Regression gate**. |

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
| `PLAYWRIGHT_BASE_URL` | URL base opcional. **Recomendado: dejarla sin definir** para que CI use `red.mvps.website` y el token QA en query (`?x-token-qa=…`). Solo configúrala si quieres otro host explícito. |
| `PLAYWRIGHT_APP` | `mergedpdf` o `pdfhint` |
| `PLAYWRIGHT_MVPS_SLOT` | Slot `1`–`10` o vacío para `red` |
| `PLAYWRIGHT_RUNNER` | `self-hosted` para regresión en runner con VPN (Mailpit + pdfhint); vacío → `ubuntu-latest` |
| `PLAYWRIGHT_DEFAULT_TEST_IP` | País simulado en query (`?ip=…`) cuando el escenario no fija `ip`. Los jobs de regresión/full fijan **`ES`** (runners US de GitHub no deben forzar checkout USD + ZIP). |
| `PLAYWRIGHT_PDFHINT_BASE_URL` | Marketing pdfhint |
| `PLAYWRIGHT_PDFHINT_APP_BASE_URL` | App pdfhint si difiere |
| `SEO_LOGIN_PATHNAME` | Login cabecera pdfhint (default `/login`) |

Si no defines variables, en CI se aplica [`config/configuration.json`](../config/configuration.json) (`environment: red`, `app: mergedpdf`). Los jobs fijan `APP=mergedpdf`.

### Job **ci-fast** (push / PR gate)

Solo `@PDFEDITOR_SEO` en **red.mvps.website** (~4 tests). Sin pdfhint (staging.pdfhint.com exige VPN corporativa; los escenarios `@PDFHINT` / `@PDFEDITOR_PDFHINT_*` van en la regresión completa o en local). Sin dashboard ni pago.

- **Push a `main`:** solo corre **ci-fast** (~1–2 min). La regresión completa (214 tests) no se lanza en push; usa **Run workflow** con profile **`regression`** o un PR.
- Antes de los tests, **Verify MVPS QA token access** hace `curl` a `https://red.mvps.website/?x-token-qa=…` (MVPS exige token en la URL para ver staging).
- Si un test falla, el **Summary** lista pasos Gherkin fallidos (desde `cucumber-report/messages.ndjson`) y errores de `playwright-report/results.json`. Artefacto `playwright-report-fast` incluye traces y `failure-screenshots/`.
- Secret **`QAI_TOKEN_PARAM`**: obligatorio en GitHub para CI estable. Si falta, el workflow usa el default de staging (`x-token-qa=niGqCYH7McqERAB`). Configúralo con `npm run setup:github-actions` (ver abajo).

### Secrets

| Secret | Uso |
|--------|-----|
| `QAI_TOKEN_PARAM` | Token QA en URLs MVPS (formato `x-token-qa=…`). Sin este secret, ci-fast/regresión usan el default de staging del repo. |
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

Los shards funcionales **no** ejecutan los visuales (evita duplicar ~68 tests en cada shard). El informe fusiona **18 artefactos** NDJSON (14 funcionales + 4 visuales) y capturas en `failure-artifacts-*`.

### Qué significa «VISUAL CAPTURE» en CI

| Categoría | Tag / feature | ¿En regresión PR? |
|-----------|---------------|-------------------|
| **VISUAL CAPTURE** (manual, renovar PNG de referencia) | `@MANUAL_SCREEN_CAPTURE` — [`VisualCapture.feature`](../features/VisualCapture.feature) | **No** (`--grep-invert @MANUAL_SCREEN_CAPTURE`) |
| Regresión visual automatizada (snapshots Playwright) | `@PDFEDITOR_VISUAL*` — [`Visual.feature`](../features/Visual.feature) | **Sí** (shards visuales dedicados) |

## Paralelismo (14 + 4 shards, tope 40 min)

La regresión no usa un solo runner de 3 h:

1. **regression-setup** (PR, en paralelo con **ci-fast**) o **regression-setup-dispatch** (manual) — `bddgen` una vez, artefacto `features-gen`.
2. **ci-regression-functional** — matriz **14 jobs** (`--shard=1/14` … `14/14`), ~10 tests/shard, **1 worker**, **`timeout-minutes: 40`**, **`PLAYWRIGHT_CI_RETRIES=0`** en PR (reintento 1 solo en `workflow_dispatch`).
3. **ci-regression-visual** — matriz **4 jobs** (`--shard=1/4` … `4/4`), ~17 tests/shard, mismo tope de 40 min.
4. **Publish regression report** — fusiona NDJSON + dashboard (GitHub Pages).
5. **Regression gate** — falla el check del PR si algún shard falló; repite `report/summary.md` en el Summary.

Tiempo de pared ≈ `max(shard funcional más lento, shard visual más lento)` con **límite duro de 40 min por shard**. Si un shard llega al timeout, el job se cancela y el informe puede marcar **Partial run**.

**Progreso en vivo:** en cada shard, `BDD_TERMINAL_STEPS=1` imprime cada paso Gherkin (`→ Given …`, `✔` / `✖`) en el log de Actions, además del reporter `list` de Playwright.

**Artefactos en fallo:** `failure-artifacts-shard-N` / `failure-artifacts-visual-N` incluyen `cucumber-report/failure-screenshots/`, `test-results/` (traces) y `playwright-report/`. El paso **Shard failure summary** (`npm run report:shard-summary`) lista pasos Gherkin fallidos en el log y en el job Summary.

En CI, Playwright usa `trace: on-first-retry` y `video: off` para reducir artefactos `blob-report-*` (antes ~500 MB–1 GB por shard con `retain-on-failure` + vídeo).

Si **regression-setup** falla con *No files were found* al subir el artefacto, comprueba que existan `*.spec.js` bajo `.features-gen/` tras `bddgen` y que el paso de upload tenga `include-hidden-files: true`.

Los shards de regresión usan `PLAYWRIGHT_CI_WORKERS: '1'` para reducir presión sobre `red.mvps.website`.

### Geo / ZIP en checkout (runners US)

Los runners `ubuntu-latest` de GitHub salen con IP **estadounidense**. Sin `?ip=…`, staging puede mostrar **USD + campo ZIP** mientras los escenarios por defecto esperan **EUR** (`1.95 EUR`).

- Los jobs de regresión definen `PLAYWRIGHT_DEFAULT_TEST_IP=ES` → [`homeQueryFromTestData`](../tests/helpers/testIpQuery.ts) añade `?ip=ES` en Home/Editor cuando el Gherkin no fija `ip`.
- Escenarios `@PDFEDITOR_PAYMENT_IP_US` siguen forzando `?ip=US`; [`fillStripePaymentLikeLegacy`](../tests/helpers/stripePayment.ts) rellena país + ZIP (`90210`) solo para `testData.ip === US`.

### Mailpit y VPN (emails transaccionales)

Mailpit (`mailpit.1ecorp.net`) y pdfhint staging requieren **VPN corporativa** desde runners públicos de GitHub. Sin VPN verás `Mailpit list: HTTP 403` (o **401** sin credenciales) en escenarios `@TransactionalEmails` y parte de `@PDFHINT`.

**Comprobar en tu entorno:**

1. **Settings → Variables → Actions** → `PLAYWRIGHT_RUNNER`: si está vacío, los shards usan `ubuntu-latest`.
2. En logs de un shard con `TransactionalEmails`, busca `Mailpit` / `HTTP 403` / `HTTP 401`.
3. Desde una máquina sin VPN: `curl -sI https://mailpit.1ecorp.net/api/v1/messages` suele devolver **401** (no accesible como en QAI Dogs con VPN).

**Opciones:**

| Opción | Cuándo |
|--------|--------|
| **A — Self-hosted + VPN (recomendado)** | Registra runner con VPN; `PLAYWRIGHT_RUNNER=self-hosted`. Misma red que QAI Dogs. |
| **B — Excluir Mailpit en CI público** | Si no hay runner VPN: etiquetar escenarios Mailpit con `@CI_NO_MAILPIT` y `--grep-invert` en el workflow hasta tener runner (no implementado por defecto). |
| **C — Solo local** | Ejecutar `@TransactionalEmails` con VPN en máquina de desarrollo. |

1. Registra un **self-hosted runner** con acceso VPN (misma red que QAI Dogs).
2. En **Settings → Variables**, define `PLAYWRIGHT_RUNNER` = `self-hosted`.
3. Los jobs **ci-regression-functional** y **ci-regression-visual** usarán ese runner; mantén secrets `PLAYWRIGHT_MAILPIT_USER` / `PLAYWRIGHT_MAILPIT_PASSWORD` (`npm run setup:github-actions`).

Con `PLAYWRIGHT_RUNNER` vacío, la regresión sigue en `ubuntu-latest` (MVPS/CRM/pago con `?ip=ES` OK; Mailpit y pdfhint VPN en rojo hasta tener runner VPN).

## Lanzar la regresión (manual)

1. **Actions** → workflow **Playwright** → **Run workflow**.
2. Rama: `main` (o la rama a validar).
3. **profile:** `regression`.
4. En manual: **regression-setup-dispatch** y shards arrancan sin esperar a **ci-fast**. En PR: **ci-fast** → **regression-setup** → shards.
5. Esperar **14× functional** + **4× visual** → **Publish regression report**.
6. Abrir el informe desde el **job summary** del job **Publish regression report** (enlace al dashboard) o la URL de GitHub Pages (abajo).

## Informe QAI-style (GitHub Pages)

Tras cada regresión (PR o `profile: regression`), el job **Publish regression report** fusiona los **18** fragmentos NDJSON (14 funcionales + 4 visuales) y los PNG en `failure-artifacts-*`, y publica un dashboard HTML (cuadrícula, passed/failed/skipped, pasos Gherkin con mensaje de error, capturas en fallos). El merge deduce **PASSED/FAILED** desde los pasos Gherkin cuando playwright-bdd no envía `testCaseResult` en `testCaseFinished`.

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
| Detalle | Pasos Given/When/Then (sin hooks) con estado y mensaje de error en el paso fallido |
| Screenshot | PNG del fallo (sidecar por shard, no embebido en NDJSON) |
| Playwright HTML | Enlace a traces/vídeo/screenshots (fusión de blobs; omitida si supera ~500 MB; si no, artefactos `blob-report-*`) |

### Artefactos por shard (depuración)

Cada shard sube siempre (aunque pase):

| Artefacto | Contenido |
|-----------|-----------|
| `cucumber-messages-shard-N` | `messages.ndjson` (fusionable) |
| `failure-artifacts-shard-N` | PNG + `manifest.ndjson`, `test-results/` traces, `playwright-report/` |
| `blob-report-shard-N` | Blobs Playwright para traces |
| `cucumber-messages-visual-N` | Visual sharded |
| `failure-artifacts-visual-N` | Capturas y traces visual |
| `blob-report-visual-N` | Blobs visual |
| `regression-report` | Dashboard HTML + `summary.md` (job **Regression gate**) |

En CI, `messages.ndjson` usa `skipAttachments: true` (pocos MB). Las capturas van en `cucumber-report/failure-screenshots/`. Local: `CUCUMBER_EMBED_ATTACHMENTS=1` embebe adjuntos en NDJSON para depuración.

### Solución de problemas

#### CI fast en push (fallo ~1 min)

| Síntoma | Causa habitual | Qué hacer |
|---------|----------------|-----------|
| **Verify MVPS QA token access** en rojo | MVPS no responde con token desde IP de GitHub | Comprobar secret `QAI_TOKEN_PARAM` (`npm run setup:github-actions`); si el token es correcto y sigue fallando, allowlist IP de GitHub Actions o runner self-hosted |
| **Run fast suite** en rojo, preflight verde | Test SEO MVPS (ver **Summary** del job) | Revisar lista de fallos en el Summary; artefacto `playwright-report-fast` |
| Variable `PLAYWRIGHT_BASE_URL` mal puesta | Apunta a pdfhint u otro host sin token MVPS | Dejar la variable **sin definir** |
| Pago falla con **ZIP inválido** / precios USD en regresión | Runner US sin `?ip=ES`; port Playwright sin ZIP para `@PDFEDITOR_PAYMENT_IP_US` | Confirmar `PLAYWRIGHT_DEFAULT_TEST_IP=ES` en workflow; escenarios US deben forzar `ip` en Gherkin |

#### Informe de regresión (GitHub Pages)

Si el job **Publish regression report** falla o no hay enlace al dashboard:

| Síntoma | Causa habitual | Qué hacer |
|---------|----------------|-----------|
| Paso **Merge cucumber messages** en rojo | `messages.ndjson` de varios GB (capturas embebidas en runs antiguos) o OOM al fusionar | Usar commit con `skipAttachments: true`; el merge actual ignora adjuntos y parsea por streaming |
| **Deploy** en rojo, merge en verde | GitHub Pages no activado | **Settings → Pages → Deploy from branch → `gh-pages` / (root)** |
| Dashboard **106 total, 0 passed** | Run parcial + merge antiguo sin inferir estado desde pasos | Re-ejecutar con commit actual; debe mostrar **~214** y passed/failed > 0 |
| Dashboard con **Partial run** | Menos de **18/18** artefactos con datos (timeout 40 min o cancelación) | Revisar shards; no lanzar dos regresiones a la vez en la misma rama |
| Pasos con IDs `…-step-0` en el modal | Merge antiguo sin `testCase.testSteps.pickleStepId` | Usar commit actual de `merge-regression-report.mjs` y re-publicar informe |
| Sin screenshots en fallos del dashboard | Artefactos `failure-artifacts-*` no indexados o `manifest.ndjson` ausente | Mismo merge actual; artefactos ya suben PNG + `manifest.ndjson` |
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
| `fast` | ci-fast | SEO MVPS only (PR/push gate; sin pdfhint) |
| `full` | ci-fast → ci-full | Funcional completo en un runner (sin visual) |
| `visual` | ci-visual | Solo `@PDFEDITOR_VISUAL*` (manual) |
| `regression` | setup → 14 + 4 shards (40 min/shard) → report → gate | Regresión completa paralela |

## Disparo automático en pull requests

Cada **pull request** hacia **`main`** ejecuta en paralelo **ci-fast** (smoke SEO) y **regression-setup**, luego la regresión completa (**14 + 4 shards**, tope 40 min/shard), informe y **Regression gate**.

Los **push** a **`main`** ejecutan solo **ci-fast** (~1–2 min). La regresión completa no corre en push; valida en el PR antes del merge o con **Run workflow** → profile **`regression`**.

Los PR desde **forks** no reciben secrets del repo base.

## Comandos locales equivalentes

```bash
npm run test:ci-regression
```

Regresión completa en un solo proceso (sin sharding).

Depurar un shard:

```bash
npm run bddgen
npm run test:ci-regression-functional-shard -- --shard=1/14 --list
npm run test:ci-regression-functional-shard -- --shard=1/14
npm run test:ci-regression-visual-shard -- --shard=1/4 --list
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

- [ ] `GH_TOKEN=… npm run setup:github-actions` (crea `QAI_TOKEN_PARAM` y el resto de secrets).
- [ ] **No** definir `PLAYWRIGHT_BASE_URL` salvo que quieras otro host.
- [ ] Variables y secrets configurados (tablas arriba).
- [ ] `gh workflow run … profile=regression` o Run workflow en la UI.
- [ ] Revisar logs: `bddgen` y recuento de tests.
- [ ] Si timeouts masivos en `*.mvps.website`: allowlist GitHub Actions o runner self-hosted.
- [ ] GitHub Pages activado (**Settings → Pages → branch `gh-pages` / root**).
- [ ] Tras el run: job **Publish regression report** en verde; enlace en **Summary**.
- [ ] URL: `https://<owner>.github.io/<repo>/runs/<run_id>/`.
