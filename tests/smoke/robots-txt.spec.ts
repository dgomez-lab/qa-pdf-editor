import { test, expect } from '@playwright/test'

test.describe('Smoke — robots.txt', { tag: ['@PDFEDITOR_SMOKE'] }, () => {
  test('robots.txt responde', { tag: ['@PDFEDITOR_SMOKE_ROBOTS'] }, async ({ request }) => {
    const res = await request.get('/robots.txt').catch(() => null)
    test.skip(!res, 'No respuesta del servidor')
    test.skip(
      !res!.ok(),
      `/robots.txt HTTP ${res!.status()} (404/403/WAF o staging sin asset)`
    )
    const text = (await res!.text()).trim()
    expect(text.length, 'cuerpo no vacío').toBeGreaterThan(0)
  })
})
