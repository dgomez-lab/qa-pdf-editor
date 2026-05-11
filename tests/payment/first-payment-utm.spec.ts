import { test } from '@playwright/test'
import { runEditorUploadRegisterAndVisaPayment } from '../helpers/pdfhintEditorPaymentFlow'

function paymentSmokeEnabled(): boolean {
  const v = process.env.PLAYWRIGHT_PAYMENT_SMOKE?.trim()
  return v === '1' || v === 'true' || v === 'yes'
}

type UtmCase = { tag: string; q: Record<string, string> }

const variants: UtmCase[] = [
  {
    tag: '@PDFEDITOR_PAYMENT_UTM_SOURCE_GOOGLE_MEDIUM_CPC',
    q: { utm_source: 'google', utm_medium: 'cpc' }
  },
  {
    tag: '@PDFEDITOR_PAYMENT_UTM_SOURCE_BING_MEDIUM_CPC',
    q: { utm_source: 'bing', utm_medium: 'cpc' }
  },
  {
    tag: '@PDFEDITOR_PAYMENT_UTM_SOURCE_GOOGLE_MEDIUM_CPC_CONTENT_DISPLAY',
    q: { utm_source: 'google', utm_medium: 'cpc', utm_content: 'display' }
  },
  {
    tag: '@PDFEDITOR_PAYMENT_UTM_SOURCE_BING_MEDIUM_CPC_CONTENT_DISPLAY',
    q: { utm_source: 'bing', utm_medium: 'cpc', utm_content: 'display' }
  },
  {
    tag: '@PDFEDITOR_PAYMENT_UTM_SOURCE_GOOGLE_MEDIUM_EMAIL_CAMPAIGN_1',
    q: { utm_source: 'google', utm_medium: 'email', utm_campaign: '1' }
  },
  {
    tag: '@PDFEDITOR_PAYMENT_UTM_SOURCE_GOOGLE_MEDIUM_EMAIL_CAMPAIGN_2',
    q: { utm_source: 'google', utm_medium: 'email', utm_campaign: '2' }
  },
  {
    tag: '@PDFEDITOR_PAYMENT_UTM_SOURCE_BING_MEDIUM_EMAIL_CAMPAIGN_1',
    q: { utm_source: 'bing', utm_medium: 'email', utm_campaign: '1' }
  },
  {
    tag: '@PDFEDITOR_PAYMENT_UTM_SOURCE_BING_MEDIUM_EMAIL_CAMPAIGN_2',
    q: { utm_source: 'bing', utm_medium: 'email', utm_campaign: '2' }
  },
  {
    tag: '@PDFEDITOR_PAYMENT_UTM_SOURCE_MEDIUM_EMAIL_CAMPAIGN_3',
    q: { utm_source: 'bing', utm_medium: 'email', utm_campaign: '3' }
  },
  // Tag agregado en Playwright para alinear el "smoke UTM" anterior con paridad legacy.
  {
    tag: '@PDFEDITOR_PAYMENT_FIRST_UTM',
    q: {
      utm_source: process.env.PLAYWRIGHT_UTM_SOURCE?.trim() || 'playwright',
      utm_medium: process.env.PLAYWRIGHT_UTM_MEDIUM?.trim() || 'e2e',
      utm_campaign: process.env.PLAYWRIGHT_UTM_CAMPAIGN?.trim() || 'qa-pdf-editor'
    }
  }
]

/**
 * `FirstPayment.feature` — Scenario Outline "Initial payment with different UTMs".
 */
test.describe('First payment — UTM en Home (paridad legacy)', { tag: ['@PDFEDITOR_PAYMENT'] }, () => {
  test.beforeEach(() => {
    test.skip(!paymentSmokeEnabled(), 'PLAYWRIGHT_PAYMENT_SMOKE=1')
  })

  for (const v of variants) {
    test(`UTM ${Object.entries(v.q).map(([k, vv]) => `${k}=${vv}`).join(' ')}`, { tag: [v.tag] }, async ({ page }) => {
      test.setTimeout(360_000)
      const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const email = process.env.PLAYWRIGHT_TEST_EMAIL ?? `playwright+utm+${unique}@example.com`
      await runEditorUploadRegisterAndVisaPayment(page, { email, homeQuery: v.q })
    })
  }
})
