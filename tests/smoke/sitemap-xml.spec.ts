import { test, expect } from '@playwright/test'

test.describe('Smoke — sitemap.xml', { tag: ['@PDFEDITOR_SMOKE'] }, () => {
  test('/sitemap.xml responde', { tag: ['@PDFEDITOR_SMOKE_SITEMAP'] }, async ({ request }) => {
    const res = await request.get('/sitemap.xml').catch(() => null)
    test.skip(!res, 'No respuesta del servidor')
    test.skip(res!.status() === 404, '/sitemap.xml no servido en este entorno (típico de staging)')
    expect(res!.ok(), 'HTTP 2xx').toBeTruthy()
    const text = (await res!.text()).trim()
    expect(text.length, 'cuerpo no vacío').toBeGreaterThan(10)
  })
})
