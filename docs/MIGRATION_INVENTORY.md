# Inventario: qai-pa-pdf-editor (Bitbucket) → qa-pdf-editor (Playwright)

Origen local analizado: `/home/dgomez/Workspace/qai-pa-pdf-editor`.

## Stack actual (Selenium)

| Área | Detalle |
|------|---------|
| Lenguaje | TypeScript 5.5 |
| Gestor | Yarn 4 (`packageManager`) |
| BDD | `@cucumber/cucumber` 12 |
| Núcleo | `qai-pa-core` (git Bitbucket) — bot, waits, elementos, `DogKernel`, grid Selenium |
| Driver | `selenium-webdriver` 4.35 (en `runner/package.json`), `chromedriver` 146 |
| Recursos | `qai-pa-pdf-editor-resources` (git) — PDFs de prueba p. ej. `QA.pdf` vía `DogFileUploader` |
| Visual | `resemblejs` |
| Features | `features/*.feature` (9 archivos): `PDFhint`, `SEO`, `Dashboard`, `Users`, `Visual`, `TransactionalEmails`, `Recurrences`, `payment/FirstPayment`, `VisualCapture` |
| Steps | `src/steps/*Steps.ts` → compilado a `build/steps/*.js` para `cucumber-js -p terminal` |
| Page objects | `src/pages/**/*.ts` + `elements.json` (finders `data-id`, xpath, css) |
| Config | JSON en `config/`: `configuration.json`, `configuration.pdfhint.json`; ruta vía `QAI_PA_CONFIGURATION_PATH` |
| PDFhint staging | `projectVars.baseUrl`: `https://staging.pdfhint.com`, `appendQaToken: false` |
| Grid Selenium | `driver.ip` / `driver.port` en JSON (p. ej. `34.246.201.123:44965`) — pipeline Bitbucket asume allowlist de IP |

## Equivalente en Playwright (URLs)

En **qa-pdf-editor**, [`playwright/resolveBaseUrl.ts`](../playwright/resolveBaseUrl.ts) reproduce `ProjectData.getUrl()` / staging pdfhint: `BASE_URL` explícita, o `APP=pdfhint` vs `APP=mergedpdf` + `MVPS_SLOT` + `QAI_TOKEN_PARAM`. Ver [README.md](../README.md).

## CI Bitbucket

- Archivo: `bitbucket-pipelines.yml`
- Pipeline custom `pdfhint-smoke`: Node 22, `yarn install`, `QAI_PA_CONFIGURATION_PATH=config/configuration.pdfhint.json`, `yarn test:pdfhint-smoke`
- Tags Cucumber del smoke pdfhint: `@PDFEDITOR_PDFHINT_SMOKE_VISA`, `_REFUND`, `_DASHBOARD`, `_SEO`

## Scripts npm relevantes

- `yarn test:pdfhint-smoke` — smoke pdfhint (Cucumber + tags anteriores)
- `yarn test` — `@test` con perfil terminal

## Dependencias no portables a GitHub público

- `qai-pa-core`, `qai-pa-pdf-editor-resources`, `qai-system` vía git+ssh Bitbucket
- Datos de tarjeta / proyecto en `projectJsonData` / `testJsonData` dentro del paquete core o JSON del proyecto
- Grid Selenium remoto y allowlist IP (comentario en pipeline)

## Mapeo a Playwright (este repo)

| Cucumber / Selenium | Playwright en qa-pdf-editor |
|---------------------|---------------------------|
| `DogKernel` + grid | Navegador local del runner (`chromium`); sin Selenium Grid |
| `configuration.pdfhint.json` | Variables de entorno (`BASE_URL`, opcionales para pago) |
| `executeScript` SEO | `page.evaluate()` con los mismos scripts que `src/steps/seoSteps.ts` |
| Subidas `QA.pdf` desde paquete | `tests/fixtures/sample.pdf` en el repo |
| Pagos Stripe en iframes | Escenarios en `features/payment/FirstPayment.feature` + pasos BDD (opcional, `PLAYWRIGHT_PAYMENT_SMOKE=1`) |
| Steps Cucumber | [`tests/bdd/steps/`](../tests/bdd/steps/) (`playwright-bdd`) |
| `.feature` ejecutables | `features/**/*.feature` → `npm run bddgen` → `.features-gen/` |

## Cobertura portada en Playwright-BDD (paridad 100%)

`npm run porting:tags` reporta **`missingFromPlaywright: []`** sobre los **219** tags `@PDFEDITOR_*` del legacy (o de `features/` vendored). Cobertura por feature (Gherkin en `features/`, pasos en `tests/bdd/steps/`):

- `SEO.feature` — header / landing / footer / forms.
- `PDFhint.feature` — `_SMOKE_VISA`, `_SMOKE_REFUND`, `_SMOKE_DASHBOARD`, `_SMOKE_SEO`.
- `payment/FirstPayment.feature` — tarjetas, errores, refund x6, IP x5, cancel x2, UTM x9, UTM register x8.
- `Recurrences.feature` — 14056 success + soft decline.
- `Users.feature` — 25 tags `_USER_*`.
- `Dashboard.feature` — 7 tags `_DASHBOARD_*`.
- `TransactionalEmails.feature` — 62 tags Mailpit.
- `Visual.feature` — 68 tags; baselines en `tests/visual/baseline/`.
- `VisualCapture.feature` — captura manual (`@MANUAL_SCREEN_CAPTURE`), fuera del gate CI estándar.

## Cierre de paridad y backlog técnico

- **Paridad de tags:** 219/219 (ver `npm run porting:tags`).
- **Ejecución real:** escenarios BDD contra staging cuando se exportan credenciales (Stripe / CRM / Mailpit / Recurrences API). Sin credenciales, `test.skip` con motivo descriptivo.
- **Baselines visuales:** `tests/visual/baseline/`; regresión con `PLAYWRIGHT_VISUAL_SNAPSHOTS=1 npm run test:ci-visual`.
- **Fixtures binarios DOCX/XLSX/PPTX/JPG/JPEG/PNG:** configurar `PLAYWRIGHT_FIXTURE_<FORMAT>` o copiar a `tests/fixtures/sample.<ext>` ([`tests/helpers/multiFormatUpload.ts`](../tests/helpers/multiFormatUpload.ts)).
