import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { createBdd, test as base } from 'playwright-bdd'
import type { MailpitMessageDetail } from '../helpers/mailpitClient'

export type BddWorld = {
  testData: Record<string, string>
  recurrenceNumber: number
  email: string
  currentPage: string
  crmPage: Page | null
  magicLinkRequestedAtMs?: number
  magicLinkMessage?: { HTML?: string; Text?: string }
  accountCreatedEmailRequestedAtMs?: number
  accountCreatedEmailDetail?: MailpitMessageDetail
  paymentConfirmationDetail?: MailpitMessageDetail
  documentSentDetail?: MailpitMessageDetail
  subscriptionPurchaseDateMs?: number
  lastTransactionId?: string
  subscriptionId?: string
  lastOrderId?: string
  qaBlockCustomerId?: string
  unsubscribeCancellationEmailRequestedAtMs?: number
  unsubscribeCancellationEmailDetail?: MailpitMessageDetail
  documentSentEmailRequestedAtMs?: number
  popup: Page | null
}

export const BLOCKED_THIRD_PARTY_REQUEST =
  /google-analytics|googletagmanager|g\.doubleclick|connect\.facebook|hotjar|segment\.io|sentry\.io/i

export const test = base.extend<{ bddWorld: BddWorld }>({
  context: async ({ context }, use) => {
    await context.route('**/*', (route) => {
      if (BLOCKED_THIRD_PARTY_REQUEST.test(route.request().url())) return route.abort()
      return route.continue()
    })
    await use(context)
  },
  bddWorld: async ({ page }, use) => {
    const w: BddWorld = {
      testData: {},
      recurrenceNumber: 0,
      email: '',
      currentPage: 'Home',
      crmPage: null,
      popup: null
    }
    await use(w)
    if (w.crmPage && !w.crmPage.isClosed()) {
      await w.crmPage.close().catch(() => {})
    }
  }
})

export const { Given, When, Then, Before, After } = createBdd(test)

export { expect }
