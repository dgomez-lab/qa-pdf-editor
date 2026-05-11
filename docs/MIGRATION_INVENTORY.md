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
| Pagos Stripe en iframes | `tests/pdfhint/payment-smoke.spec.ts` (opcional, `PLAYWRIGHT_PAYMENT_SMOKE=1`) |

## Cobertura portada en Playwright (v2 — paridad 100%)

`npm run porting:tags` reporta **`missingFromPlaywright: []`** sobre los 211 tags `@PDFEDITOR_*` del legacy. Cobertura por feature:

- `SEO.feature` — header / landing / footer / forms (`tests/seo/*`).
- `PDFhint.feature` — `_SMOKE_VISA`, `_SMOKE_REFUND`, `_SMOKE_DASHBOARD`, `_SMOKE_SEO` (`tests/pdfhint/*`).
- `payment/FirstPayment.feature` — tarjetas (Visa/MC/Amex/Discover/Diners/JCB/UnionPay), errores (wrong card / insufficient / expired / lost / stolen / cvc), refund por tarjeta (6), IP (5), cancel (user/agent), UTM (9) y UTM register (8). `tests/payment/*`.
- `Recurrences.feature` — 14056 success + soft decline (`tests/payment/recurrences-14056-*.spec.ts`).
- `Users.feature` — 25 tags `_USER_*` (14 specs en `tests/users/`).
- `Dashboard.feature` — 7 tags `_DASHBOARD_*` (`tests/dashboard/*`).
- `TransactionalEmails.feature` — 62 tags (account-created x12, payment-confirmation: smoke + currency x5 + locale x12, magic-link x10, document-sent x11, subscription-cancellation x12).
- `Visual.feature` — 68 tags (`tests/visual/visual-public-pages.spec.ts`, `visual-products.spec.ts`, `visual-forms.spec.ts`, `visual-auth-modals.spec.ts`, `visual-account-session.spec.ts`).
- `VisualCapture.feature` — flujo de captura manual, no contabilizado en paridad de tags (`@PDFEDITOR_*` no presentes).

## Cierre de paridad y backlog técnico

- **Paridad de tags:** 211/211 (ver `npm run porting:tags`).
- **Ejecución real:** todos los specs ejecutan contra staging cuando se exportan las credenciales (Stripe / CRM / Mailpit / Recurrences API). Sin credenciales se aplica `test.skip` con motivo descriptivo (no se reporta como fallo).
- **Baselines visuales:** se generan en el primer run con `PLAYWRIGHT_VISUAL_SNAPSHOTS=1 npx playwright test tests/visual --update-snapshots` y se commitean a `tests/visual/**/*-snapshots/`.
- **Fixtures binarios DOCX/XLSX/PPTX/JPG/JPEG/PNG:** no incluidos por defecto. Configurar `PLAYWRIGHT_FIXTURE_<FORMAT>` o copiar a `tests/fixtures/sample.<ext>` (helper [tests/helpers/multiFormatUpload.ts](../tests/helpers/multiFormatUpload.ts)).
