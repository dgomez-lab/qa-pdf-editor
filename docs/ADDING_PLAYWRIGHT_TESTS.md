# Añadir pruebas: Playwright frente a `.feature` (Gherkin)

En **qai-pa-pdf-editor** el contrato legible por negocio vive en `features/*.feature` y los pasos en `src/steps/*.ts`.

En **qa-pdf-editor** no hay parser Gherkin: cada flujo se implementa en **TypeScript** en archivos `tests/**/*.spec.ts`. Eso equivale a *feature + escenarios + glue* en un solo artefacto.

## Dónde crear el archivo

| Área | Carpeta sugerida | Referencia legacy |
|------|------------------|-------------------|
| SEO | `tests/seo/` | `features/SEO.feature` |
| Smokes carga / editor | `tests/smoke/` | pasos home/editor en legacy |
| PDFhint staging | `tests/pdfhint/` | `features/PDFhint.feature` (SEO, pago, dashboard, refund, [qa-api-base-smoke](../tests/pdfhint/qa-api-base-smoke.spec.ts) opcional) |
| Pago / FirstPayment | `tests/payment/` | `features/payment/FirstPayment.feature` |
| Dashboard | `tests/dashboard/` | `features/Dashboard.feature` |
| Visual | `tests/visual/` | `features/Visual.feature`: páginas en [`visual-public-pages.spec.ts`](../tests/visual/visual-public-pages.spec.ts); cuenta con sesión + Mailpit en [`visual-account-session.spec.ts`](../tests/visual/visual-account-session.spec.ts) (`npm run test:visual-account`). |
| Usuarios | `tests/users/` | `features/Users.feature` |
| Emails | `tests/emails/` | `features/TransactionalEmails.feature` — `npm run test:emails-all` o specs sueltos ([`transactional-account-created.spec.ts`](../tests/emails/transactional-account-created.spec.ts), [`transactional-payment-confirmation.spec.ts`](../tests/emails/transactional-payment-confirmation.spec.ts)). |
| Smokes Mailpit | `tests/smoke/` | p. ej. [`magic-link-login-smoke.spec.ts`](../tests/smoke/magic-link-login-smoke.spec.ts) (`npm run test:smoke-magic-link`). |
| Recurrencias API | `tests/payment/` | [`recurrences-api-smoke.spec.ts`](../tests/payment/recurrences-api-smoke.spec.ts) si existe `PLAYWRIGHT_RECURRENCE_API_BASE_URL`. |

Convención de nombre: `kebab-case.spec.ts` (por ejemplo `seo-home.spec.ts`).

## Plantilla mínima (tags como en Cucumber)

Los tags `@PDFEDITOR_*` deben alinearse con el escenario o tag del `.feature` legacy para que `playwright test --grep` y CI coincidan con Cucumber.

Hay un archivo copiable (no se ejecuta en la suite): [`docs/snippets/minimal-playwright.spec.ts`](../docs/snippets/minimal-playwright.spec.ts).

```typescript
import { test, expect } from '@playwright/test'
import { openHome } from '../helpers/navigation'

test.describe('Mi área — breve descripción', { tag: ['@PDFEDITOR_MI_GRUPO'] }, () => {
  test('comportamiento concreto', { tag: ['@PDFEDITOR_MI_ESCENARIO_TAG'] }, async ({ page }) => {
    await openHome(page)
    await expect(page.locator('main')).toBeVisible()
  })
})
```

Ejemplos reales en el repo: [`tests/seo/seo-home.spec.ts`](../tests/seo/seo-home.spec.ts), [`tests/smoke/home-loads.spec.ts`](../tests/smoke/home-loads.spec.ts).

## Qué reutilizar (paridad con page objects legacy)

- Selectores editor / home: [`tests/pages/editorSelectors.ts`](../tests/pages/editorSelectors.ts) + [`tests/pages/editor/elements.json`](../tests/pages/editor/elements.json) (equivalente a `src/pages/editor` + `home` del legacy).
- Dashboard: [`tests/pages/dashboardSelectors.ts`](../tests/pages/dashboardSelectors.ts) + [`tests/pages/dashboard/elements.json`](../tests/pages/dashboard/elements.json).
- Navegación y cookies: [`tests/helpers/navigation.ts`](../tests/helpers/navigation.ts) (`openHome(page)` o `openHome(page, { query: { utm_source: '…' } })` para UTM en la raíz).
- Navegación marketing en **MVPS** (`*.mvps.website`): [`tests/helpers/mvpsUrl.ts`](../tests/helpers/mvpsUrl.ts) (`gotoMarketingPath`, `ensureMvpsMarketingUrl`) — el `baseURL` va **sin** `?x-token-qa=` para que no se pierda al hacer `goto('/forms')`. Sobre **About** en mergedpdf: [`marketingAboutPath()`](../tests/helpers/siteContext.ts) → `/about-us`.
- Comprobar que una página marketing “cargó”: en smokes se usa [`marketingMainOrHero(page)`](../tests/helpers/marketingPage.ts) (`<main>` o primer `h1`–`h3`, por layouts sin `<main>`).
- Pago Stripe: [`tests/helpers/stripePayment.ts`](../tests/helpers/stripePayment.ts).
- URL base (`red` / `redN` / pdfhint): [`playwright/resolveBaseUrl.ts`](../playwright/resolveBaseUrl.ts) (ya aplicado en `playwright.config.ts`).

Para portar un escenario nuevo, abre el `.feature` y los **steps** asociados en `qai-pa-pdf-editor` (`src/steps/*Steps.ts`) y traduce cada paso a `await page...` / `expect(...)`.

## Después de escribir el test

1. Actualiza la tabla correspondiente en [`PORTING_STATUS.md`](PORTING_STATUS.md) (Hecho / Parcial / Pendiente y enlace al `.spec.ts`).
2. Ejecuta filtrado por tag contra el entorno deseado:

```bash
APP=mergedpdf npm run test:tag -- @PDFEDITOR_MI_ESCENARIO_TAG
# o pdfhint staging por defecto:
npm run test:tag -- @PDFEDITOR_MI_ESCENARIO_TAG
```

3. Conteos del repo legacy (opcional): `npm run porting:stats` (requiere `qai-pa-pdf-editor` en `../qai-pa-pdf-editor` o `LEGACY_REPO`).

## Si necesitáis archivos `.feature` otra vez

Hoy el repo **no** integra Cucumber ni generación desde Gherkin. Opciones a largo plazo (evaluación de equipo): herramientas BDD tipo **playwright-bdd** / cucumber con segundo pipeline. El camino mantenido aquí es **solo Playwright** + tags + `PORTING_STATUS.md` como trazabilidad.
