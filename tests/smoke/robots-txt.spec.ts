import { test, expect } from '@playwright/test'

test.describe('Smoke — robots.txt', { tag: ['@PDFEDITOR_SMOKE'] }, () => {
  test('robots.txt responde', { tag: ['@PDFEDITOR_SMOKE_ROBOTS'] }, async ({ request }) => {
    const res = await request.get('/robots.txt').catch(() => null)
    test.skip(!res, 'No respuesta del servidor')
    test.skip(res!.status() === 404, '/robots.txt no servido en este entorno (típico de staging)')
    expect(res!.ok(), 'HTTP 2xx').toBeTruthy()
    const text = (await res!.text()).trim()
    expect(text.length, 'cuerpo no vacío').toBeGreaterThan(0)
  })
})
