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
| `the payment confirmation email contains the expected plan, amount, account and bank statement details` | `transactionalEmailSteps.ts` | [`paymentConfirmationEmailStrictAssertions.ts`](../tests/helpers/paymentConfirmationEmailStrictAssertions.ts) | OK |
| `the account created email contains expected welcome content and get started CTA` | `accountCreatedEmailSteps.ts` | [`accountCreatedEmailAssertions.ts`](../tests/helpers/accountCreatedEmailAssertions.ts) | OK |
| `the magic link email is in the expected language` | headline per locale | [`magicLinkEmailAssertions.ts`](../tests/helpers/magicLinkEmailAssertions.ts) | **Fixed** |
| `the subscription cancellation email contains expected localized content` | `unsubscribeEmailSteps.ts` | [`subscriptionCancellationEmailAssertions.ts`](../tests/helpers/subscriptionCancellationEmailAssertions.ts) | **Fixed** |
| Document sent / download code / URL | `documentSentEmailSteps.ts` | [`core.steps.ts`](../tests/bdd/steps/core.steps.ts) + [`mailpitClient.ts`](../tests/helpers/mailpitClient.ts) | OK |

### Mailpit execution contract

The shared client is [`tests/helpers/mailpitClient.ts`](../tests/helpers/mailpitClient.ts). Configure secrets in `.env`; never add credentials to a feature or tracked configuration file.

| Setting | Behavior |
|---------|----------|
| `PLAYWRIGHT_MAILPIT_URL` | Optional API v1 base URL; defaults to `https://mailpit.1ecorp.net/api/v1`. |
| `PLAYWRIGHT_MAILPIT_USER` + `PLAYWRIGHT_MAILPIT_PASSWORD` | Both are required to send the Basic Auth header. If either is missing, no authorization header is sent; scenarios do not skip, so an API rejection surfaces as an HTTP error. |
| Network access | Mailpit requires the appropriate corporate network/VPN. Public runners commonly return HTTP 401/403; see [GitHub regression — Mailpit and VPN](GITHUB_REGRESSION.md#mailpit-y-vpn-emails-transaccionales). |

Polling follows the same workflow for magic-link, account-created, payment, document-sent, and cancellation emails:

1. [`toCatcherEmail`](../tests/helpers/mailpitClient.ts) maps the registration address to the same local part at `catcher.1ecorp.net`.
2. The client polls every 1.5 seconds, sorts messages newest-first, and requires an exact normalized recipient match.
3. Locale-specific subject fragments narrow most searches. Magic-link, account-created, document-sent, and cancellation flows also reject messages older than the timestamp captured before the triggering action.
4. The selected summary is fetched through `GET /message/{id}` before body assertions or link/code extraction.

The BDD steps set explicit 120-second waits for magic-link and account-created mail, and 180 seconds for payment, document-sent, and cancellation mail. Payment confirmation matching has no `afterMs` cutoff; keep the default unique scenario email when possible. Reusing `PLAYWRIGHT_TEST_EMAIL` can select an older receipt with the same recipient and localized subject.

| Email | Assertion inputs and constraints |
|-------|----------------------------------|
| Payment confirmation | Registration email, `testData.ip` (default `ES`), and locale (default `en`). Checks the Full Access plan, initial/monthly amount from [`currencyByIp.ts`](../tests/helpers/currencyByIp.ts), 10-digit account ID, `ch_…` transaction ID, date, and QA environment marker. |
| Account created | Localized subject and welcome copy, normalized catcher email, and an absolute HTTPS “Get started” CTA. |
| Magic link | Localized headline in the HTML/text body. |
| Document sent | Locale-aware subject, first non-image HTTPS download URL, and a four-digit verification code recognized across supported languages. |
| Subscription cancellation | Localized subject/opening, Full Access, normalized catcher email, and an access-until date seven days after the recorded purchase date. |

Common failures:

| Symptom | Check |
|---------|-------|
| `Mailpit list: HTTP 401` | Both Mailpit credentials are present and current. |
| `Mailpit list: HTTP 403` | The runner has VPN/corporate network access. |
| `sin mensaje ... en 120000ms` / `180000ms` | Catcher recipient, scenario locale, trigger action, and request timestamp. |
| Assertions read an unexpected payment receipt | Remove a fixed `PLAYWRIGHT_TEST_EMAIL` or use a unique address for the run. |

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
- **SEO** on `red.mvps.website`: the header wait requires `mostUsedForm` to finish hydrating to `/forms`; a persistent `/most-used-forms` value is marketing content drift.
- **Payment / Mailpit**: payment scenarios require working staging checkout; email checks require Mailpit credentials and network access. The Mailpit steps fail rather than skip when these are unavailable.

---

## Verification

```bash
npm run typecheck
npx playwright test tests/helpers/crmPaymentGrid.spec.ts
npm run test:tag -- @PDFEDITOR_PAYMENT_FIRST_VISA
npm run test:tag -- @PDFEDITOR_TRANSACTIONAL_EMAIL_ACCOUNT_CREATED_EN
npm run test:tag -- @PDFEDITOR_TRANSACTIONAL_EMAIL_PAYMENT_CONFIRMATION_EUR
```

After a failing run, open Cucumber step report: `npm run test:report`.
