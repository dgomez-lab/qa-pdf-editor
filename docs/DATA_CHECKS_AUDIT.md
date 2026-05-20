# Data checks audit: qai-pa-pdf-editor → qa-pdf-editor

Parity reference for every Gherkin assertion that compares expected data (tables, email bodies, CRM grid, SEO lists). Implementation lives in `tests/bdd/steps/core.steps.ts` and `tests/helpers/`.

## CRM transaction grid (`#transactionRow-0`)

Legacy source: `CrmCustomerPage.extractLastPaymentData` in `qai-pa-pdf-editor/src/pages/crm/customer/crmCustomer.ts` — columns via `td:nth-of-type(n)` (1-based).

Playwright source: [`tests/helpers/crmPaymentGrid.ts`](../tests/helpers/crmPaymentGrid.ts) + [`tests/helpers/crmStaging.ts`](../tests/helpers/crmStaging.ts).

| Field | Legacy `nth-of-type` | `cells[]` index |
|-------|---------------------|-----------------|
| orderId | 1 | 0 |
| createdAt | 2 | 1 |
| requestedPaymentDate | 3 | 2 |
| paymentDate | 4 | 3 |
| transactionType | 5 | 4 |
| transactionStatus | 6 | 5 |
| amount | 7 | 6 |
| currency | 8 | 7 |
| transactionId | 9 | 8 |
| paymentSolution | 10 | 9 |
| **cardType** | **12** | **11** |
| subscriptionName | 17 | 16 |

**Fixed (2026-05):** Playwright previously read `cardType` from index 10 (gateway label, e.g. `Mid Stripe Luxor`) instead of index 11 (`credit`).

### Gherkin steps (CRM)

| Step | Legacy | Playwright helper | Status |
|------|--------|-------------------|--------|
| `I check the last first transaction payment data:` | `assert.deepEqual` after extract | `assertLastPaymentTableDeepEqual(..., 'first transaction')` | **Fixed** |
| `I check the last refund payment data:` | same (no cardType) | `assertLastPaymentTableDeepEqual(..., 'refund')` | OK |
| `I check the last recurrency payment data:` | `waitForNewPayment` + extract | `waitForNewPaymentLikeLegacy` + deep equal | **Fixed** |
| `all date fields of the last transaction should be today` | columns 2–4 | `assertLastTransactionDatesAreToday` | OK |
| `the customer domain should be {domain}` | `extractCustomerDomain` | `getLocatorForPage` + `toHaveText` in `core.steps.ts` | OK (PDFMAU-1246) |
| `expectLastTransactionMatches` (refund helper) | partial contains | uses `CRM_TRANSACTION_COLUMNS` | **Fixed** |

Unit tests: [`tests/helpers/crmPaymentGrid.spec.ts`](../tests/helpers/crmPaymentGrid.spec.ts).

---

## Transactional emails (Mailpit)

| Step | Legacy file | Playwright helper | Status |
|------|-------------|-------------------|--------|
| `the payment confirmation email contains the expected plan, amount, account and bank statement details` | `transactionalEmailSteps.ts` | `paymentConfirmationEmailStrictAssertions.ts` | OK |
| `the account created email contains expected welcome content and get started CTA` | `accountCreatedEmailSteps.ts` | `accountCreatedEmailAssertions.ts` | OK |
| `the magic link email is in the expected language` | headline per locale | `magicLinkEmailAssertions.ts` | **Fixed** |
| `the subscription cancellation email contains expected localized content` | `unsubscribeEmailSteps.ts` | `subscriptionCancellationEmailAssertions.ts` | **Fixed** |
| Document sent / download code / URL | `documentSentEmailSteps.ts` | `core.steps.ts` + `mailpitClient.ts` | OK |

---

## UI element assertions

| Pattern | Legacy | Playwright | Status |
|---------|--------|------------|--------|
| `The text of element X should contain Y` | `assertConditions` | `toContainText` | OK |
| `The text of element X should be Y` | exact | `toHaveText` (+ CRM subscription poll) | OK |
| `The value of element X should be Y` | value | `toHaveValue` | OK |
| `The page does (not) have element X` | presence | `toBeVisible` / `toHaveCount(0)` | OK |

---

## SEO absolute hrefs

| Step | Legacy | Playwright | Status |
|------|--------|------------|--------|
| Header / landing / footer / forms absolute URLs | `seoSteps.ts` | `seoAbsoluteHrefs.ts` + `core.steps.ts` | OK (failures = site content drift, not wrong checks) |

---

## Visual

| Step | Legacy | Playwright | Status |
|------|--------|------------|--------|
| `the comparison of X page should be correct` | resemble | `toHaveScreenshot` + `tests/visual/baseline/` | OK |

---

## Env-dependent (not assertion logic)

- **Recurrences** (`@PDFEDITOR_PAYMENT_RECURRENCE_LEGACY_14056`): fixed legacy customer email in feature; must exist in staging CRM.
- **SEO** paths on `red.mvps.website` (e.g. `/most-used-forms` vs `/forms`).
- **Payment / Mailpit**: require `PLAYWRIGHT_PAYMENT_SMOKE=1` and reachable Mailpit.

---

## Verification

```bash
npm run typecheck
npx playwright test tests/helpers/crmPaymentGrid.spec.ts
PLAYWRIGHT_PAYMENT_SMOKE=1 npm run test:tag -- @PDFEDITOR_PAYMENT_FIRST_VISA
```

After a failing run, open Cucumber step report: `npm run test:report`.
