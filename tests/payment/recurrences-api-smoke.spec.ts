import { test, expect } from '@playwright/test'

/**
 * Hook opcional cuando exista un endpoint de recurrencias/suscripción en staging (legacy `PdfApi` o similar).
 */
test.describe('Recurrences — API opcional', { tag: ['@PDFEDITOR_PAYMENT_RECURRENCE'] }, () => {
  test('health si PLAYWRIGHT_RECURRENCE_API_BASE_URL', async ({ request }) => {
    const raw = process.env.PLAYWRIGHT_RECURRENCE_API_BASE_URL?.trim()
    if (!raw) {
      test.skip(true, 'PLAYWRIGHT_RECURRENCE_API_BASE_URL no definido')
      return
    }
    const root = raw.replace(/\/+$/, '')
    const paths = ['/health', '/api/health', '/v1/health']
    let ok = false
    for (const p of paths) {
      const res = await request.get(`${root}${p}`).catch(() => null)
      if (res && res.ok()) {
        ok = true
        break
      }
    }
    expect(ok, `ninguna ruta health respondió OK bajo ${root}`).toBeTruthy()
  })
})
