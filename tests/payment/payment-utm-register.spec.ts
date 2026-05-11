import { test } from '@playwright/test'
import { runEditorUploadRegisterAndVisaPayment } from '../helpers/pdfhintEditorPaymentFlow'

function paymentSmokeEnabled(): boolean {
  const v = process.env.PLAYWRIGHT_PAYMENT_SMOKE?.trim()
  return v === '1' || v === 'true' || v === 'yes'
}

const variants: Array<{ tag: string; q: Record<string, string> }> = [
  {
    tag: '@PDFEDITOR_PAYMENT_UTM_REGISTER_ALL',
    q: {
      utm_adgroup: 'adgroup',
      utm_network: 'network',
      utm_device: 'device',
      utm_devicemodel: 'devicemodel',
      utm_matchtype: 'matchtype',
      utm_loc_physical_ms: 'locphysicalms',
      utm_campaigntype: 'campaigntype'
    }
  },
  { tag: '@PDFEDITOR_PAYMENT_UTM_REGISTER_ADGROUP', q: { utm_adgroup: 'adgroup' } },
  { tag: '@PDFEDITOR_PAYMENT_UTM_REGISTER_NETWORK', q: { utm_network: 'network' } },
  { tag: '@PDFEDITOR_PAYMENT_UTM_REGISTER_DEVICE', q: { utm_device: 'device' } },
  { tag: '@PDFEDITOR_PAYMENT_UTM_REGISTER_DEVICEMODEL', q: { utm_devicemodel: 'devicemodel' } },
  { tag: '@PDFEDITOR_PAYMENT_UTM_REGISTER_MATCHTYPE', q: { utm_matchtype: 'matchtype' } },
  { tag: '@PDFEDITOR_PAYMENT_UTM_REGISTER_LOCPHYSICALMS', q: { utm_loc_physical_ms: 'locphysicalms' } },
  { tag: '@PDFEDITOR_PAYMENT_UTM_REGISTER_CAMPAIGNTYPE', q: { utm_campaigntype: 'campaigntype' } }
]

/**
 * `FirstPayment.feature` — Scenario Outline "User register with other UTMs":
 * URLs con utm_adgroup/_network/_device/... y completar pago Visa hasta descarga.
 */
test.describe('Payment — UTM register (otros campos)', { tag: ['@PDFEDITOR_PAYMENT'] }, () => {
  test.beforeEach(() => {
    test.skip(!paymentSmokeEnabled(), 'PLAYWRIGHT_PAYMENT_SMOKE=1')
  })

  for (const v of variants) {
    test(`UTM register ${Object.keys(v.q).join(',')}`, { tag: [v.tag] }, async ({ page }) => {
      test.setTimeout(360_000)
      const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const email = process.env.PLAYWRIGHT_TEST_EMAIL ?? `playwright+utmreg+${unique}@example.com`
      await runEditorUploadRegisterAndVisaPayment(page, { email, homeQuery: v.q })
    })
  }
})
