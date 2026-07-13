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

## SEO MVPS y ci-fast

Los escenarios `@PDFEDITOR_SEO` de MVPS validan enlaces de marketing sobre `red.mvps.website` y son el gate rápido de push/PR. La página puede terminar `domcontentloaded` antes de que la cabecera y el grid de formularios tengan los `href` finales, así que las aserciones SEO no deben leer el DOM inmediatamente después de navegar.

| Necesidad | Usar | Cubierto por |
|-----------|------|--------------|
| Abrir Home MVPS con token QA y esperar UI útil | [`openHome`](../tests/helpers/navigation.ts) | `gotoMarketingPath`, cierre de cookies, espera de logo/file input/main y recarga extra en CI si la primera carga no queda lista |
| Validar cabecera `logIn` / `mostUsedForm` | [`collectHeaderAbsoluteHrefErrors`](../tests/helpers/seoAbsoluteHrefs.ts) | `waitForMvpsHeaderHydration` antes de evaluar y una recarga si quedan errores en MVPS |
| Validar `/forms` | [`collectFormsPageAbsoluteHrefErrors`](../tests/helpers/seoAbsoluteHrefs.ts) | `waitForMvpsFormsGridHydration` antes de leer los anchors del grid |
| Validar pdfhint | [`collectPdfhintHeaderSeoErrors`](../tests/helpers/pdfhintHeaderSeo.ts) | Busca primero el enlace visible "Log in" por rol y luego `a[data-id="logIn"]` como fallback |

Restricciones al añadir o tocar pasos SEO:

- Reutiliza los helpers anteriores desde `tests/bdd/steps/core.steps.ts`; no dupliques esperas con `page.waitForTimeout`.
- Mantén `gotoMarketingPath` para rutas MVPS: añade el token QA y conserva `BASE_URL` normalizado.
- Si un test local pasa y **ci-fast** falla, compara el Summary del job y el artefacto `playwright-report-fast`; en CI `openHome` usa ventanas de espera más largas y puede recargar una vez antes de fallar.
- Los reintentos son intencionalmente distintos: **ci-fast** usa `PLAYWRIGHT_CI_RETRIES=2`, los shards de regresión en PR usan `0`, y `workflow_dispatch` de regresión usa `1`.
- Si el fallo aparece antes del test, revisa **Verify MVPS QA token access** y el secret `QAI_TOKEN_PARAM`; si pasa el preflight, el problema ya está dentro de navegación/hidratación/aserciones SEO.

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
