# Añadir pruebas: Playwright-BDD y `.feature` (Gherkin)

En **qai-pa-pdf-editor** el contrato legible por negocio vive en `features/*.feature` y los pasos en `src/steps/*.ts`.

En **qa-pdf-editor** los mismos `.feature` están en [`features/`](../features/) (vendored). **Playwright ejecuta Gherkin** vía [playwright-bdd](https://github.com/vitalets/playwright-bdd): `bddgen` genera specs en `.features-gen/` y los pasos viven en [`tests/bdd/steps/`](../tests/bdd/steps/). La lógica reutilizable sigue en [`tests/helpers/`](../tests/helpers/) y [`tests/pages/`](../tests/pages/).

## Dónde tocar cada capa

| Capa | Ubicación | Cuándo editarla |
|------|-----------|-----------------|
| Escenario / tag | `features/<área>.feature` | Nuevo comportamiento de negocio o nuevo tag `@PDFEDITOR_*` |
| Paso Gherkin | Mismo `.feature` | Frase que aún no existe en ningún step |
| Implementación del paso | `tests/bdd/steps/*.ts` | Traducir la frase a Playwright (`Given` / `When` / `Then` desde [`tests/bdd/fixtures.ts`](../tests/bdd/fixtures.ts)) |
| Selectores legacy | `tests/bdd/legacy-elements/**/elements.json` | Nuevo `data-id` o finder del POM Selenium |
| POM / helpers | `tests/pages/`, `tests/helpers/` | Flujos largos (pago, CRM, Mailpit) reutilizables entre pasos |

| Área | `.feature` | Pasos típicos |
|------|------------|---------------|
| SEO | `features/SEO.feature` | `core.steps.ts` |
| PDFhint | `features/PDFhint.feature` | `core.steps.ts` |
| Pago | `features/payment/FirstPayment.feature` | `core.steps.ts` + helpers Stripe/CRM |
| Dashboard | `features/Dashboard.feature` | `core.steps.ts` |
| Visual | `features/Visual.feature` | `core.steps.ts` → baselines en `tests/visual/baseline/` |
| Usuarios | `features/Users.feature` | `core.steps.ts` |
| Emails | `features/TransactionalEmails.feature` | `core.steps.ts` + Mailpit |
| Recurrencias | `features/Recurrences.feature` | `core.steps.ts` |
| Captura manual | `features/VisualCapture.feature` | Manual (`@MANUAL_SCREEN_CAPTURE`); no es paridad CI |

## Flujo para un escenario nuevo

1. Añade o extiende el escenario en el `.feature` con el tag `@PDFEDITOR_*` alineado al legacy.
2. Si la frase Gherkin ya existe en otro escenario, no hace falta código nuevo.
3. Si la frase es nueva, implementa el paso en `tests/bdd/steps/` (reutiliza [`stepHelpers.ts`](../tests/bdd/stepHelpers.ts), [`pageFactory.ts`](../tests/bdd/pageFactory.ts), [`elementRegistry.ts`](../tests/bdd/elementRegistry.ts)).
4. Regenera y ejecuta:

```bash
npm run bddgen
npm run test:tag -- @PDFEDITOR_MI_ESCENARIO_TAG
```

5. Actualiza [`PORTING_STATUS.md`](PORTING_STATUS.md) si cambia el alcance del port.
6. Verifica paridad de tags: `npm run porting:tags` (esperado `missingFromPlaywright: []`).

## Ejemplo mínimo de paso

```typescript
import { Given } from '../fixtures'
import { openHome } from '../../helpers/navigation'

Given('I am on the home page', async ({ page }) => {
  await openHome(page)
})
```

Los escenarios se escriben en Gherkin; no hace falta crear `tests/**/*.spec.ts` (retirados en la migración BDD).

## Qué reutilizar (paridad con page objects legacy)

- Registro de elementos: [`tests/bdd/elementRegistry.ts`](../tests/bdd/elementRegistry.ts) + JSON en [`tests/bdd/legacy-elements/`](../tests/bdd/legacy-elements/).
- POM TypeScript: [`tests/pages/`](../tests/pages/) (`*Page.ts` + `elements.json` donde aplique).
- Navegación: [`tests/helpers/navigation.ts`](../tests/helpers/navigation.ts).
- MVPS / marketing: [`tests/helpers/mvpsUrl.ts`](../tests/helpers/mvpsUrl.ts), [`tests/helpers/marketingPage.ts`](../tests/helpers/marketingPage.ts).
- Pago Stripe: [`tests/helpers/stripePayment.ts`](../tests/helpers/stripePayment.ts).
- URL base: [`playwright/resolveBaseUrl.ts`](../playwright/resolveBaseUrl.ts).

Para portar un escenario del legacy, abre el `.feature` y `qai-pa-pdf-editor/src/steps/*Steps.ts`; busca si la frase ya está cubierta en [`tests/bdd/steps/core.steps.ts`](../tests/bdd/steps/core.steps.ts) antes de añadir bindings.

## Tags y CI

Los tags `@PDFEDITOR_*` en los `.feature` son los que filtra `playwright test --grep` (vía `npm run test:tag`). La CI ejecuta `npm run bddgen` antes de los jobs de test (ver [`.github/workflows/playwright.yml`](../.github/workflows/playwright.yml)).

Pago real en sandbox: `PLAYWRIGHT_PAYMENT_SMOKE=1` (y credenciales CRM/Mailpit donde el escenario lo requiera).

## Subidas multi-formato y landings de producto

Los escenarios como [`features/Users.feature`](../features/Users.feature) usan dos pasos reutilizables:

```gherkin
When I am in product landing page wordToPDF
And I upload a DOCX document
```

El mapeo vive en [`tests/helpers/multiFormatUpload.ts`](../tests/helpers/multiFormatUpload.ts) y lo consumen [`tests/bdd/pageFactory.ts`](../tests/bdd/pageFactory.ts) y [`tests/bdd/steps/core.steps.ts`](../tests/bdd/steps/core.steps.ts):

| Dato del `.feature` | Qué controla | Ejemplos |
|---------------------|--------------|----------|
| `landingAlt` | Ruta `/lp/...` de marketing antes de subir | `wordToPDF`, `excelToPDF`, `pwpToPDF`, `jpgToPDF`, `pngToPDF`, `mergePDF` |
| `format` | Fixture que se carga en el input de Home/pdfhint | `PDF`, `DOCX`, `XLSX`, `PPTX`, `JPG`, `JPEG`, `PNG` |

Reglas para fixtures:

- `PDF` usa [`tests/fixtures/sample.pdf`](../tests/fixtures/sample.pdf).
- Otros formatos buscan `tests/fixtures/sample.<ext>` primero.
- Si el binario no debe commitearse, define una ruta absoluta con `PLAYWRIGHT_FIXTURE_<FORMAT>`, por ejemplo `PLAYWRIGHT_FIXTURE_DOCX=/tmp/sample.docx`.
- Si no hay fixture para el formato, `I upload a <format> document` falla con `No fixture for format ...`; usa `fixturePathOrSkip` solo en helpers nuevos donde el escenario deba omitirse de forma explícita.
- `JPEG` reutiliza el flujo de landing `jpgToPDF` y se normaliza a fixture JPG en `uploadDocumentForFormat`.

Al añadir un producto nuevo, actualiza el mapa `LANDING_PATHS` antes de crear más pasos Gherkin; si el slug no existe, el helper cae a `/lp/<slug-en-minusculas>`, que solo sirve cuando la URL real sigue esa convención.

## Dónde ver los tests generados

Tras `npm run bddgen`, los archivos ejecutables aparecen bajo [`.features-gen/`](../.features-gen/) (gitignored). La fuente de verdad sigue siendo `features/**/*.feature`.

## Logs e informes de fallo (paridad con qai-pa-pdf-editor)

| Necesidad | Cómo |
|-----------|------|
| Resumen `✔`/`✖` por paso Gherkin | `npm run test:report` → [`cucumber-report/index.html`](../cucumber-report/index.html) (generado en cada `playwright test`) |
| Pasos en terminal en vivo | Por defecto en local (`npm run test:tag`); desactivar con `BDD_TERMINAL_STEPS=0` |
| Logs de acciones (página/elemento) | Por defecto `DEBUG` en local; ver [`tests/bdd/bddLogger.ts`](../tests/bdd/bddLogger.ts) |
| URL al fallar | Automático en [`tests/bdd/steps/hooks.steps.ts`](../tests/bdd/steps/hooks.steps.ts) |
| Trace / screenshot Playwright | `npx playwright show-report` y `test-results/**` |

El informe Cucumber es el equivalente al resumen final y a `results/dogReport.html` del legacy Selenium.

## Snippet histórico (specs manuales)

El archivo [`docs/snippets/minimal-playwright.spec.ts`](snippets/minimal-playwright.spec.ts) documenta el patrón antiguo `*.spec.ts`; **no** forma parte de la suite actual. Usar Gherkin + pasos BDD.
