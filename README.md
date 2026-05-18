# qa-pdf-editor

Suite E2E del editor PDF en **Playwright + TypeScript**, migrada desde el proyecto Bitbucket **qai-pa-pdf-editor** (Cucumber + Selenium + `qai-pa-core`).

## Requisitos

- Node.js 20+
- Red saliente al entorno bajo prueba. El pipeline Bitbucket original asume **allowlist de IP**; en GitHub Actions puede hacer falta un runner con acceso similar.

## Instalación

```bash
npm ci
npx playwright install chromium
```

## URL base (alineado con `ProjectData.getUrl` / `configuration.pdfhint`)

La resolución está en [`playwright/resolveBaseUrl.ts`](playwright/resolveBaseUrl.ts) y se usa en [`playwright.config.ts`](playwright.config.ts). Si no defines `BASE_URL`, se elige el destino con **`APP`**:

| Objetivo | Variables | URL resultante |
|----------|-------------|----------------|
| **pdfhint** staging (por defecto) | `APP=pdfhint` o omitir `APP` | `https://staging.pdfhint.com` (override con `PDFHINT_BASE_URL`) |
| **mergedpdf** stage / dinámicos | `APP=mergedpdf` o `APP=mvps` | `https://red.mvps.website` (origen **sin** query; el token `x-token-qa` se añade en cada navegación vía [`tests/helpers/mvpsUrl.ts`](tests/helpers/mvpsUrl.ts)) |
| Slot **red1…red10** | `APP=mergedpdf` + `MVPS_SLOT=1` … `10` | `https://red1.mvps.website` (+ token en cada `goto`) |
| Igual que `projectVars.environment` | `ENVIRONMENT=red3` | `https://red3.mvps.website` (+ token en cada `goto`) |
| Control total | `BASE_URL=https://...` | Si es `*.mvps.website` **con** `?x-token-qa=…`, el host se normaliza y el query pasa a `QAI_TOKEN_PARAM` (Playwright pierde el query del `baseURL` al resolver rutas absolutas `/ruta`). |

Nota CI: en GitHub Actions, si `APP` / `PLAYWRIGHT_APP` llegan vacíos y no hay
`BASE_URL`, el default es **`mergedpdf`** para mantener acceso al entorno MVPS.
Fuera de Actions, omitir `APP` sigue resolviendo a **pdfhint**.

Parámetros opcionales:

- `QAI_TOKEN_PARAM` — query del token QA (por defecto `x-token-qa=niGqCYH7McqERAB`). Si `BASE_URL` ya trae `?x-token-qa=…`, se reutiliza al normalizar el host.
- `APPEND_QA_TOKEN=false` — no añadir token en [`gotoMarketingPath`](tests/helpers/mvpsUrl.ts) (casos excepcionales).
- Tras resolver, se asigna `process.env.BASE_URL` para que helpers como `isPdfhintSite()` coincidan con el `baseURL` de Playwright.

Ejemplos:

```bash
APP=mergedpdf MVPS_SLOT= npm test
APP=mergedpdf MVPS_SLOT=2 npm test
BASE_URL='https://red.mvps.website/?x-token-qa=niGqCYH7McqERAB' npm test
```

## Tags (paridad con Cucumber)

Los tests llevan `tag:` con el mismo estilo `@PDFEDITOR_...` que en Gherkin. Ejemplos:

```bash
npm run test:tag -- @PDFEDITOR_PDFHINT_SMOKE_SEO
npm run test:tag -- @PDFEDITOR_SEO_HOME_HEADER_ABSOLUTE_HREFS
PLAYWRIGHT_PAYMENT_SMOKE=1 npm run test:tag -- @PDFEDITOR_PDFHINT_SMOKE_VISA
```

(`npm run test:grep` es alias de `test:tag`.)

## Otras variables

| Variable | Descripción |
|----------|-------------|
| `PLAYWRIGHT_PAYMENT_SMOKE` | `1` / `true` para ejecutar el flujo de pago (`tests/pdfhint/payment-smoke.spec.ts`). |
| `PLAYWRIGHT_TEST_EMAIL` | Email fijo para el test de pago. |
| `STRIPE_TEST_CARD_NUMBER` / `EXP` / `CVC` | Tarjeta de prueba Stripe (por defecto 4242… / 1234 / 123). |
| `SEO_LOGIN_PATHNAME` | Pathname esperado del Login en marketing pdfhint (por defecto `/en/login`). |
| `PLAYWRIGHT_TRACE` | `1` fuerza `trace: 'on'` en toda la suite (útil para depurar Stripe). |
| `HEADLESS` / `SLOWMO` | Depuración local del runner; ver [docs/PLAYWRIGHT_RUNNER.md](docs/PLAYWRIGHT_RUNNER.md). |

En GitHub: variable `PLAYWRIGHT_BASE_URL` y, si aplica, `PLAYWRIGHT_APP` / `MVPS_SLOT` (ver workflow). El job **Tag parity** (`npm run porting:tags`) en Actions usa `SKIP_LEGACY_TAG_CHECK=1` porque no se clona `qai-pa-pdf-editor`; en local, con `../qai-pa-pdf-editor`, ejecuta `npm run porting:tags` sin esa variable para la comprobación completa.

La configuración del runner carga `.env` y `.env.local`, define timeouts,
artefactos, reintentos y diferencias CI/local en
[docs/PLAYWRIGHT_RUNNER.md](docs/PLAYWRIGHT_RUNNER.md).

## Scripts

| Comando | Uso |
|---------|-----|
| `npm test` | Toda la suite (pago **omitido** salvo `PLAYWRIGHT_PAYMENT_SMOKE=1`). |
| `npm run test:tag -- @TAG` | Filtrar por tag Cucumber/Playwright. |
| `npm run test:seo` | Solo `tests/seo`. |
| `npm run test:smoke` | Smokes + SEO pdfhint. |
| `npm run test:pdfhint-smoke` | Equivalente al grep del smoke SEO pdfhint. |
| `npm run test:payment` | Pago opcional con `PLAYWRIGHT_PAYMENT_SMOKE=1`. |
| `npm run test:payment-mergedpdf` | Igual, forzando `APP=mergedpdf` (red.mvps + token QA). Opcional: `MVPS_SLOT=2`, `PLAYWRIGHT_TRACE=1`. |
| `npm run test:refund-smoke` | Refund CRM (`PLAYWRIGHT_PAYMENT_SMOKE=1` + credenciales CRM). |
| `npm run test:pdfhint-dashboard` | Flujo PDFhint login → dashboard → pago (`PLAYWRIGHT_PDFHINT_DASHBOARD_SMOKE=1` + Mailpit o flag sin Mailpit). |
| `npm run test:dashboard-paid` | `@PDFEDITOR_DASHBOARD`: pago Visa + modal éxito → Dashboard (`PLAYWRIGHT_PAYMENT_SMOKE=1`). |
| `npm run test:users-contact` | `@PDFEDITOR_USER_CONTACT` — formulario `/contact`. |
| `npm run test:transactional-account-created` | Mailpit + pdfhint: correo “account created” (12 locales; `PLAYWRIGHT_MAILPIT_URL`). |
| `npm run test:transactional-created-all` | Igual, alias explícito para ejecutar todo el spec de locales. |
| `npm run test:transactional-payment-confirmation` | Tras pago Visa, correo en Mailpit (opt-in `PLAYWRIGHT_TRANSACTIONAL_PAYMENT_CONFIRMATION=1`). |
| `npm run test:first-mastercard` | `@PDFEDITOR_PAYMENT_FIRST_MASTERCARD` — pago MasterCard hasta descarga (`PLAYWRIGHT_PAYMENT_SMOKE=1`). |
| `npm run test:first-amex` | `@PDFEDITOR_PAYMENT_FIRST_AMEX` — pago Amex hasta descarga (`PLAYWRIGHT_PAYMENT_SMOKE=1`). |
| `npm run test:first-wrong-card` | `@PDFEDITOR_PAYMENT_FIRST_WRONG_CARD` — pago declinado y aserción de error (`PLAYWRIGHT_PAYMENT_SMOKE=1`). |
| `npm run test:first-utm` | `@PDFEDITOR_PAYMENT_FIRST_UTM` — Home con UTM + pago Visa (`PLAYWRIGHT_PAYMENT_SMOKE=1`). |
| `npm run test:first-insufficient` | `@PDFEDITOR_PAYMENT_FIRST_INSUFFICIENT_FUNDS` — fondos insuficientes (`PLAYWRIGHT_PAYMENT_SMOKE=1`). |
| `npm run test:first-discover` | `@PDFEDITOR_PAYMENT_FIRST_DISCOVER` — pago Discover (`PLAYWRIGHT_PAYMENT_SMOKE=1`). |
| `npm run test:first-expired` | `@PDFEDITOR_PAYMENT_FIRST_EXPIRED_CARD` — tarjeta caducada (`PLAYWRIGHT_PAYMENT_SMOKE=1`). |
| `npm run test:first-jcb` | `@PDFEDITOR_PAYMENT_FIRST_JCB` — pago JCB (`PLAYWRIGHT_PAYMENT_SMOKE=1`). |
| `npm run test:first-unionpay` | `@PDFEDITOR_PAYMENT_FIRST_UNIONPAY` — UnionPay. |
| `npm run test:first-diners` | `@PDFEDITOR_PAYMENT_FIRST_DINERS` — Diners Club. |
| `npm run test:recurrences-api` | Health opcional si `PLAYWRIGHT_RECURRENCE_API_BASE_URL` está definido. |
| `npm run test:first-payment-all` | Todos los tags `@PDFEDITOR_PAYMENT_FIRST_*` con pago activo. |
| `npm run test:smoke-faqs` | `@PDFEDITOR_SMOKE_FAQS` — carga `/faqs`. |
| `npm run test:smoke-cookies` | `@PDFEDITOR_SMOKE_COOKIES` — carga `/cookies`. |
| `npm run test:smoke-terms` | `@PDFEDITOR_SMOKE_TERMS` — carga `/terms-and-conditions`. |
| `npm run test:smoke-terms-alt` | `@PDFEDITOR_SMOKE_TERMS_ALT` — carga `/terms`. |
| `npm run test:smoke-privacy` | `@PDFEDITOR_SMOKE_PRIVACY` — carga `/privacy`. |
| `npm run test:smoke-magic-link` | `@PDFEDITOR_SMOKE_MAGIC_LINK` — login pdfhint vía Mailpit. |
| `npm run test:smoke-contact` | `@PDFEDITOR_SMOKE_CONTACT` — carga `/contact`. |
| `npm run test:smoke-about` | `@PDFEDITOR_SMOKE_ABOUT` — carga `/about`. |
| `npm run test:smoke-robots` | `@PDFEDITOR_SMOKE_ROBOTS` — `GET /robots.txt`. |
| `npm run test:smoke-sitemap` | `@PDFEDITOR_SMOKE_SITEMAP` — `GET /sitemap.xml`. |
| `npm run test:smoke-lp-pdf-to-word` | `@PDFEDITOR_SMOKE_LP_PDF_TO_WORD` — landing `/lp/pdf-to-word`. |
| `npm run test:smoke-pricing` | `@PDFEDITOR_SMOKE_PRICING` — `/pricing` (omite si 404). |
| `npm run test:smoke-login` | `@PDFEDITOR_SMOKE_LOGIN` — ruta de login (pdfhint `/en/login` o `/login`). |
| `npm run test:smoke-lp-marketing-core` | Siete smokes `@PDFEDITOR_SMOKE_LP_*` (merge, edit, sign, split, compress, watermark, rotate). |
| `npm run test:smoke-lp-extra` | `@PDFEDITOR_SMOKE_LP_PDF_TO_JPG`, `@PDFEDITOR_SMOKE_LP_EXCEL_TO_PDF`. |
| `npm run test:first-stolen` | `@PDFEDITOR_PAYMENT_FIRST_STOLEN_CARD` — tarjeta robada (Stripe test). |
| `npm run test:first-incorrect-cvc` | `@PDFEDITOR_PAYMENT_FIRST_INCORRECT_CVC` — CVC inválido (Stripe test). |
| `npm run test:pdfhint-all` | Todos los specs en `tests/pdfhint/`. |
| `npm run test:first-lost` | `@PDFEDITOR_PAYMENT_FIRST_LOST_CARD` — tarjeta perdida (Stripe test). |
| `npm run test:qa-api-smoke` | `@PDFEDITOR_QA_API` — si `PLAYWRIGHT_QA_API_BASE_URL` está definido. |
| `npm run test:emails-all` | Todos los specs bajo `tests/emails/`. |
| `npm run test:dashboard-route` | `@PDFEDITOR_DASHBOARD_ROUTE_LOAD` — ruta dashboard o login. |
| `npm run test:users-account` | `@PDFEDITOR_USER_ACCOUNT` — carga `/en/account` o `/account`. |
| `npm run test:visual` | Regresión visual opcional (`PLAYWRIGHT_VISUAL_SNAPSHOTS=1`). |
| `npm run test:visual-update` | Regenera PNG de referencia (`--update-snapshots`). |
| `npm run test:visual-update-auth` | Solo `visual-auth-modals.spec.ts` (requiere `PLAYWRIGHT_PAYMENT_SMOKE=1` + Stripe). |
| `npm run test:visual-update-account` | Solo `visual-account-session.spec.ts` (Mailpit + rutas pdfhint). |
| `npm run test:visual-account` | `@PDFEDITOR_VISUAL_ACCOUNT` — captura `/en/account` tras magic link (Mailpit + `PLAYWRIGHT_VISUAL_SNAPSHOTS=1`). |
| `npm run test:visual-products` | 22 tags `@PDFEDITOR_VISUAL_PRODUCT_*` (LPs `/lp/...`). |
| `npm run test:visual-forms` | 18 tags `@PDFEDITOR_VISUAL_FORM_*` (formularios). |
| `npm run test:visual-auth-modals` | Modales con sesión (`@PDFEDITOR_VISUAL_EDITOR_MODAL_*`, `@PDFEDITOR_VISUAL_DASHBOARD_*`, …). |
| `npm run test:refund-visa` … `test:refund-jcb` | Pago + refund CRM por tarjeta (6 specs). |
| `npm run test:first-ip` | 5 tags `@PDFEDITOR_PAYMENT_IP_*` (US/AU/CA/ES/GB). |
| `npm run test:cancel-user` / `test:cancel-agent` | Cancel suscripción (usuario vs agente CRM). |
| `npm run test:utm-register` | 8 tags `@PDFEDITOR_PAYMENT_UTM_REGISTER_*`. |
| `npm run test:recurrences-legacy` | 2 tags `@PDFEDITOR_PAYMENT_RECURRENCE_LEGACY_14056*` (Worldpay / Padrina). |
| `npm run test:transactional-magic-link` | 10 tags `@PDFEDITOR_TRANSACTIONAL_EMAIL_MAGIC_LINK_*`. |
| `npm run test:transactional-document-sent` | 11 tags `@PDFEDITOR_TRANSACTIONAL_EMAIL_DOCUMENT_SENT_*`. |
| `npm run test:transactional-subscription-cancellation` | 12 tags `@PDFEDITOR_TRANSACTIONAL_EMAIL_SUBSCRIPTION_CANCELLATION_*`. |
| `npm run test:transactional-payment-confirmation-currency` | 5 tags `_PAYMENT_CONFIRMATION_USD/EUR/CAD/AUD/GBP`. |
| `npm run test:transactional-payment-confirmation-locale` | 12 tags `_PAYMENT_CONFIRMATION_EN` + `_LOCALE_*`. |
| `npm run porting:stats` | Estadísticas Gherkin del legacy. |
| `npm run porting:tags` | Comparador legacy vs Playwright (sale `missingFromPlaywright: []` = 100% paridad). |
| `npm run test:ui` | Playwright UI mode. |

## Documentación técnica y de migración

- [docs/MIGRATION_INVENTORY.md](docs/MIGRATION_INVENTORY.md) — inventario del repo Cucumber/Selenium.
- [docs/PORTING_STATUS.md](docs/PORTING_STATUS.md) — escenarios por feature y estado del port.
- [docs/ADDING_PLAYWRIGHT_TESTS.md](docs/ADDING_PLAYWRIGHT_TESTS.md) — **cómo añadir tests** (Playwright vs `.feature`, plantilla, tags, `grep`).
- [docs/PLAYWRIGHT_RUNNER.md](docs/PLAYWRIGHT_RUNNER.md) — configuración del runner: `.env`, URL base, debug local, timeouts, artefactos y CI.

## Paridad con Bitbucket (resumen)

- **Tag parity: 211/211 (100%)** — verificable con `npm run porting:tags` (`missingFromPlaywright: []`).
- 9 features Cucumber portadas: SEO, PDFhint, Users (14 specs), Dashboard, FirstPayment (incl. refund x6, IP x5, UTM x9, cancel x2, UTM register x8), TransactionalEmails (62 tags Mailpit), Recurrences (14056 success / soft), Visual (68 tags) + VisualCapture documentado.
- Pago Stripe: helper [`tests/helpers/stripePayment.ts`](tests/helpers/stripePayment.ts) (unificado, `#payment-element`, split, recorrido de frames `stripe.com`).
- CRM staging: helpers [`tests/helpers/crmStaging.ts`](tests/helpers/crmStaging.ts) con `refund`, `unsubscribe`, `blockCustomer`, `confirmSubscriptionCancellation`, `expectLastTransactionMatches`.
- Mailpit: helpers [`tests/helpers/mailpitClient.ts`](tests/helpers/mailpitClient.ts) con polling por search/subject/locale, `extractDownloadCode`, `extractFirstHttpsUrl`.
- Specs ejecutan contra staging real cuando se exportan las credenciales; sin ellas, `test.skip` con motivo claro (no ruido en CI).

## Estructura

```
playwright/
  resolveBaseUrl.ts          # red / redN + token vs pdfhint
scripts/
  porting-parity-stats.mjs   # Estadísticas Gherkin
  porting-tags.mjs           # Comparador de tags legacy vs Playwright
tests/
  seo/                       # SEO.feature
  smoke/                     # Home, forms, LPs, faqs, cookies, privacy, terms, sitemap, pricing, contact, about, robots, magic link, editor
  pdfhint/                   # PDFhint.feature (SEO + pago)
  payment/                   # FirstPayment.feature: tarjetas, errores, refund x6, IP x5, UTM x9, UTM register x8, cancel x2 + Recurrences 14056
  users/                     # Users.feature (14 specs cubren 25 tags)
  dashboard/                 # Dashboard.feature (7 specs)
  emails/                    # TransactionalEmails (62 tags Mailpit)
  visual/                    # Visual.feature (68 tags) + visual-account-session
  helpers/                   # stripePayment, crmStaging, mailpitClient, editorActions, dashboardActions, accountActions, loginFlow, multiFormatUpload, forceUrlParams, recurrencesApi, trustpilotWindow, ...
  pages/                     # Selectores tipo elements.json (editor, dashboard, contact)
  fixtures/                  # sample.pdf (+ sample.docx/xlsx/pptx/jpg/jpeg/png si se aportan vía PLAYWRIGHT_FIXTURE_<FORMAT>)
```
