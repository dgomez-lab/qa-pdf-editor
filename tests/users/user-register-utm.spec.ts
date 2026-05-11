import { test } from '@playwright/test'
import { runEditorUploadRegisterAndVisaPayment } from '../helpers/pdfhintEditorPaymentFlow'
import { isCrmConfigured, openCrmCustomerForEmail } from '../helpers/crmStaging'

function paymentSmokeEnabled(): boolean {
  const v = process.env.PLAYWRIGHT_PAYMENT_SMOKE?.trim()
  return v === '1' || v === 'true' || v === 'yes'
}
function crmReady(): boolean {
  return isCrmConfigured()
}

type Utm = Record<string, string>
const variants: Array<{ tag: string; utm: Utm }> = [
  {
    tag: '@PDFEDITOR_USER_REGISTER_UTM_SOURCE_GOOGLE_MEDIUM_CPC',
    utm: { utm_source: 'google', utm_medium: 'cpc' }
  },
  {
    tag: '@PDFEDITOR_USER_REGISTER_UTM_SOURCE_BING_MEDIUM_CPC_CONTENT_DISPLAY',
    utm: { utm_source: 'bing', utm_medium: 'cpc', utm_content: 'display' }
  },
  {
    tag: '@PDFEDITOR_USER_REGISTER_UTM_SOURCE_BING_MEDIUM_EMAIL_CAMPAIGN_1',
    utm: { utm_source: 'bing', utm_medium: 'email', utm_campaign: '1' }
  }
]

/**
 * `Users.feature` — Scenario Outline "User register with different UTMs".
 * En CRM se valida que `utm_source`/`utm_medium` quedan persistidos.
 */
test.describe('Users — registro con UTMs', { tag: ['@PDFEDITOR_USER'] }, () => {
  test.beforeEach(() => {
    test.skip(!paymentSmokeEnabled(), 'PLAYWRIGHT_PAYMENT_SMOKE=1')
    test.skip(!crmReady(), 'PLAYWRIGHT_CRM_USER/PASSWORD')
  })

  for (const { tag, utm } of variants) {
    test(`UTM ${utm.utm_source}/${utm.utm_medium}${utm.utm_content ? '/' + utm.utm_content : ''}${utm.utm_campaign ? '/c=' + utm.utm_campaign : ''}`, { tag: [tag] }, async ({ page, context }) => {
      test.setTimeout(360_000)
      const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const email = process.env.PLAYWRIGHT_TEST_EMAIL ?? `playwright+regutm+${unique}@example.com`

      await runEditorUploadRegisterAndVisaPayment(page, { email, homeQuery: utm })
      const crmPage = await openCrmCustomerForEmail(context, email)
      const { expect } = await import('@playwright/test')
      const src = await crmPage.locator('[data-id="customerUtmSource"]').first().innerText().catch(() => '')
      const med = await crmPage.locator('[data-id="customerUtmMedium"]').first().innerText().catch(() => '')
      if (utm.utm_source) expect(src.toLowerCase()).toContain(utm.utm_source)
      if (utm.utm_medium) expect(med.toLowerCase()).toContain(utm.utm_medium)
      await crmPage.close()
    })
  }
})
