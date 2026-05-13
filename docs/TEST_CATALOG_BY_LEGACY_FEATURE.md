# Catálogo de pruebas por `.feature` legacy (qai-pa-pdf-editor)

Vista rápida: **qué hay en Playwright** (`qa-pdf-editor`) agrupado como en Cucumber. Para paridad tag a tag y estados, ver [**PORTING_STATUS.md**](PORTING_STATUS.md). Para el mapa de carpetas Selenium → Playwright, ver [**SELENIUM_FOLDER_MAP.md**](SELENIUM_FOLDER_MAP.md).

Convención Playwright: escenarios en `tests/**/*.spec.ts` con `test.describe` / `test` y `tag: ['@PDFEDITOR_…']` cuando aplica.

---

## `features/payment/FirstPayment.feature`

| Qué | Dónde |
|-----|--------|
| Specs | [`tests/payment/`](../tests/payment/) (tarjetas, errores, refund, UTM, IP, cancel, índice [`first-payment-port.spec.ts`](../tests/payment/first-payment-port.spec.ts)), [`tests/pdfhint/payment-smoke.spec.ts`](../tests/pdfhint/payment-smoke.spec.ts) |
| Comandos útiles | `npm run test:first-payment-all`, `npm run test:payment`, `npm run test:first-mastercard`, `npm run test:first-amex`, `npm run test:first-wrong-card`, `npm run test:first-utm`, `npm run test:first-ip`, `npm run test:cancel-user`, `npm run test:cancel-agent`, `npm run test:utm-register`, scripts `test:first-*` / `test:refund-*` en [`package.json`](../package.json) |

Requiere pago real en sandbox: `PLAYWRIGHT_PAYMENT_SMOKE=1` (y CRM/Mailpit donde aplica).

---

## `features/Dashboard.feature`

| Qué | Dónde |
|-----|--------|
| Specs | [`tests/dashboard/`](../tests/dashboard/) — índice [`dashboard-port.spec.ts`](../tests/dashboard/dashboard-port.spec.ts) |
| Comandos útiles | `npm run test:dashboard-route`, `npm run test:dashboard-paid`, `npm run test:ci-full` (incluye `tests/dashboard`) |

---

## `features/PDFhint.feature`

| Qué | Dónde |
|-----|--------|
| Specs | [`tests/pdfhint/`](../tests/pdfhint/) (`pdfhint-seo-smoke`, `payment-smoke`, `pdfhint-refund-smoke`, `pdfhint-dashboard-smoke`, `qa-api-base-smoke`) |
| Comandos útiles | `npm run test:pdfhint-all`, `npm run test:pdfhint-smoke`, `npm run test:payment`, `npm run test:refund-smoke`, `npm run test:pdfhint-dashboard`, `npm run test:qa-api-smoke` |

---

## `features/Recurrences.feature`

| Qué | Dónde |
|-----|--------|
| Specs | [`recurrences-14056-success.spec.ts`](../tests/payment/recurrences-14056-success.spec.ts), [`recurrences-14056-soft.spec.ts`](../tests/payment/recurrences-14056-soft.spec.ts), [`recurrences-api-smoke.spec.ts`](../tests/payment/recurrences-api-smoke.spec.ts), [`recurrences-port.spec.ts`](../tests/payment/recurrences-port.spec.ts) |
| Comandos útiles | `npm run test:recurrences-legacy`, `npm run test:recurrences-api` |

---

## `features/SEO.feature`

| Qué | Dónde |
|-----|--------|
| Specs | [`tests/seo/seo-home.spec.ts`](../tests/seo/seo-home.spec.ts), [`tests/seo/seo-forms.spec.ts`](../tests/seo/seo-forms.spec.ts) |
| Comandos útiles | `npm run test:seo`, `npm run test:ci-fast` |

---

## `features/TransactionalEmails.feature`

| Qué | Dónde |
|-----|--------|
| Specs | [`tests/emails/`](../tests/emails/) (account-created, payment-confirmation, magic-link, document-sent, subscription-cancellation, variantes currency/locale) |
| Comandos útiles | `npm run test:emails-all`, `npm run test:transactional-account-created`, `npm run test:transactional-magic-link`, `npm run test:transactional-document-sent`, `npm run test:transactional-subscription-cancellation`, `npm run test:transactional-payment-confirmation`, etc. (ver `package.json`) |

---

## `features/Users.feature`

| Qué | Dónde |
|-----|--------|
| Specs | [`tests/users/`](../tests/users/) — índice [`users-port.spec.ts`](../tests/users/users-port.spec.ts) |
| Comandos útiles | `npm run test:users-contact`, `npm run test:users-account`, `npm run test:ci-full` (incluye `tests/users`) |

---

## `features/Visual.feature`

| Qué | Dónde |
|-----|--------|
| Specs | [`tests/visual/visual-public-pages.spec.ts`](../tests/visual/visual-public-pages.spec.ts), [`visual-products.spec.ts`](../tests/visual/visual-products.spec.ts), [`visual-forms.spec.ts`](../tests/visual/visual-forms.spec.ts), [`visual-auth-modals.spec.ts`](../tests/visual/visual-auth-modals.spec.ts), [`visual-account-session.spec.ts`](../tests/visual/visual-account-session.spec.ts) |
| Baselines PNG | `tests/visual/*.spec.ts-snapshots/` (convención Playwright) |
| Comandos útiles | `PLAYWRIGHT_VISUAL_SNAPSHOTS=1 npm run test:visual`, `npm run test:visual-update`, `npm run test:visual-update-auth`, `npm run test:visual-update-account`, `npm run test:ci-visual`, `npm run test:visual-products`, `npm run test:visual-forms`, `npm run test:visual-auth-modals`, `npm run test:visual-account` |

**Comparación vs captura de referencias**

- **Ejecutar regresión visual (comparar con baselines del repo):** `PLAYWRIGHT_VISUAL_SNAPSHOTS=1 npm run test:visual` (o subconjuntos en `package.json`).
- **Regenerar / capturar baselines** (equivalente operativo a un flujo tipo `VisualCapture` + subida de PNG): `npm run test:visual-update` (toda la carpeta `tests/visual`), o solo auth/pago: `npm run test:visual-update-auth`, o solo cuenta/Mailpit: `npm run test:visual-update-account`. Luego commit de los PNG bajo `*-snapshots/`.

Modales que requieren pago: `PLAYWRIGHT_PAYMENT_SMOKE=1` (ver PORTING_STATUS y scripts `test:visual-auth-modals`).

---

## `VisualCapture.feature` (solo legacy Cucumber)

| Qué | En Playwright |
|-----|----------------|
| Rol legacy | Escenarios de **captura manual** de referencias para la suite visual; en muchos equipos **no** van a CI. |
| Equivalente | No hay un `.feature` dedicado: usar **`npm run test:visual-update`** con el `BASE_URL` deseado y commitear snapshots en este repo. |
| `qai-pa-pdf-editor-resources` | Sigue usándose como **fixtures** (PDF, Office, imágenes de prueba), no como almacén de baselines `toHaveScreenshot`. Ver [MIGRATION_INVENTORY.md](MIGRATION_INVENTORY.md). |

---

## Smokes y rutas añadidas en Playwright (sin `.feature` homónimo en legacy)

Varios specs en [`tests/smoke/`](../tests/smoke/) amplían cobertura de carga rápida (home, forms, FAQs, legal, magic link, LPs, etc.). Resumen en PORTING_STATUS, sección *Smokes añadidos*.

---

## Verificación automática de paridad de tags

```bash
npm run porting:tags
npm run porting:stats
```
