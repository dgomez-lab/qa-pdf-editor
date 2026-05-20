# Catálogo de pruebas por `.feature` legacy (qai-pa-pdf-editor)

Vista rápida: **qué hay en Playwright-BDD** (`qa-pdf-editor`) agrupado como en Cucumber. Los mismos `.feature` están en [`features/`](../features/). Para paridad tag a tag, ver [**PORTING_STATUS.md**](PORTING_STATUS.md). Para el mapa de carpetas Selenium → Playwright, ver [**SELENIUM_FOLDER_MAP.md**](SELENIUM_FOLDER_MAP.md).

Convención actual: escenarios en `features/**/*.feature`, pasos en [`tests/bdd/steps/`](../tests/bdd/steps/), generación con `npm run bddgen` → [`.features-gen/`](../.features-gen/).

---

## `features/payment/FirstPayment.feature`

| Qué | Dónde |
|-----|--------|
| Gherkin | [`features/payment/FirstPayment.feature`](../features/payment/FirstPayment.feature) |
| Pasos | [`tests/bdd/steps/core.steps.ts`](../tests/bdd/steps/core.steps.ts) |
| Helpers | [`tests/helpers/stripePayment.ts`](../tests/helpers/stripePayment.ts), [`pdfhintEditorPaymentFlow.ts`](../tests/helpers/pdfhintEditorPaymentFlow.ts), [`crmStaging.ts`](../tests/helpers/crmStaging.ts) |
| Ejecutar | `npm run test:tag -- @PDFEDITOR_PAYMENT_FIRST_VISA` (ejemplo); suite completa: `npm run test:ci-full` |

Requiere pago real en sandbox: `PLAYWRIGHT_PAYMENT_SMOKE=1` (y CRM/Mailpit donde aplica).

---

## `features/Dashboard.feature`

| Qué | Dónde |
|-----|--------|
| Gherkin | [`features/Dashboard.feature`](../features/Dashboard.feature) |
| Pasos | [`tests/bdd/steps/core.steps.ts`](../tests/bdd/steps/core.steps.ts) |
| POM | [`tests/pages/dashboard/`](../tests/pages/dashboard/) |
| Ejecutar | `npm run test:tag -- @PDFEDITOR_DASHBOARD_*`; incluido en `npm run test:ci-full` / regression |

---

## `features/PDFhint.feature`

| Qué | Dónde |
|-----|--------|
| Gherkin | [`features/PDFhint.feature`](../features/PDFhint.feature) |
| Pasos | [`tests/bdd/steps/core.steps.ts`](../tests/bdd/steps/core.steps.ts) |
| Ejecutar | `npm run test:pdfhint-smoke` (tags `@PDFEDITOR_PDFHINT_SMOKE*`) |

---

## `features/Recurrences.feature`

| Qué | Dónde |
|-----|--------|
| Gherkin | [`features/Recurrences.feature`](../features/Recurrences.feature) |
| Pasos | [`tests/bdd/steps/core.steps.ts`](../tests/bdd/steps/core.steps.ts) |
| Helpers | [`tests/helpers/recurrencesApi.ts`](../tests/helpers/recurrencesApi.ts) |
| Ejecutar | `npm run test:tag -- @PDFEDITOR_RECURRENCES_*` |

---

## `features/SEO.feature`

| Qué | Dónde |
|-----|--------|
| Gherkin | [`features/SEO.feature`](../features/SEO.feature) |
| Pasos | [`tests/bdd/steps/core.steps.ts`](../tests/bdd/steps/core.steps.ts) |
| Ejecutar | `npm run test:tag -- @PDFEDITOR_SEO_*`; subconjunto CI: `npm run test:ci-fast` |

---

## `features/TransactionalEmails.feature`

| Qué | Dónde |
|-----|--------|
| Gherkin | [`features/TransactionalEmails.feature`](../features/TransactionalEmails.feature) |
| Pasos | [`tests/bdd/steps/core.steps.ts`](../tests/bdd/steps/core.steps.ts) |
| Helpers | [`tests/helpers/mailpitClient.ts`](../tests/helpers/mailpitClient.ts), [`paymentConfirmationEmailStrictAssertions.ts`](../tests/helpers/paymentConfirmationEmailStrictAssertions.ts) |
| Ejecutar | `npm run test:tag -- @PDFEDITOR_TRANSACTIONAL_*` |

---

## `features/Users.feature`

| Qué | Dónde |
|-----|--------|
| Gherkin | [`features/Users.feature`](../features/Users.feature) |
| Pasos | [`tests/bdd/steps/core.steps.ts`](../tests/bdd/steps/core.steps.ts) |
| POM | [`tests/pages/account/`](../tests/pages/account/), [`contact/`](../tests/pages/contact/) |
| Ejecutar | `npm run test:tag -- @PDFEDITOR_USER_*` |

---

## `features/Visual.feature`

| Qué | Dónde |
|-----|--------|
| Gherkin | [`features/Visual.feature`](../features/Visual.feature) |
| Pasos | [`tests/bdd/steps/core.steps.ts`](../tests/bdd/steps/core.steps.ts) |
| Baselines PNG | [`tests/visual/baseline/`](../tests/visual/baseline/) (`snapshotDir` en `playwright.config.ts`) |
| Ejecutar | `PLAYWRIGHT_VISUAL_SNAPSHOTS=1 npm run test:ci-visual` |

Modales que requieren pago: `PLAYWRIGHT_PAYMENT_SMOKE=1`.

---

## `VisualCapture.feature` (solo legacy Cucumber)

| Qué | En Playwright-BDD |
|-----|-------------------|
| Gherkin | [`features/VisualCapture.feature`](../features/VisualCapture.feature) (`@MANUAL_SCREEN_CAPTURE`) |
| Rol legacy | Captura manual de referencias; no es gate de CI estándar |
| Equivalente operativo | Actualizar PNG en `tests/visual/baseline/` con escenarios `@PDFEDITOR_VISUAL*` y `PLAYWRIGHT_VISUAL_SNAPSHOTS=1` |

---

## Verificación automática de paridad de tags

```bash
npm run porting:tags
npm run porting:stats
```

`porting:tags` compara tags `@PDFEDITOR_*` del legacy (o `features/` vendored) con tags presentes en `features/` + `.features-gen` tras `bddgen`.
