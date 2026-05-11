import { test, expect } from '@playwright/test'

/**
 * Si el entorno expone una base HTTP tipo legacy `PdfApi` / QA, comprobar que responde (rutas comunes).
 */
test.describe('PDFhint — QA API base (opcional)', { tag: ['@PDFEDITOR_QA_API'] }, () => {
  test('GET raíz o health', async ({ request }) => {
    const raw = process.env.PLAYWRIGHT_QA_API_BASE_URL?.trim()
    if (!raw) {
      test.skip(true, 'PLAYWRIGHT_QA_API_BASE_URL no definido')
      return
    }
    const root = raw.replace(/\/+$/, '')
    const paths = ['', '/health', '/api/health', '/api/v1/qa/ping', '/v1/ping']
    let ok = false
    let lastStatus = 0
    for (const p of paths) {
      const url = p === '' ? root : `${root}${p.startsWith('/') ? p : `/${p}`}`
      const res = await request.get(url).catch(() => null)
      lastStatus = res?.status() ?? 0
      if (res && res.ok()) {
        ok = true
        break
      }
    }
    expect(ok, `ninguna ruta respondió 2xx bajo ${root} (último HTTP ${lastStatus})`).toBeTruthy()
  })
})
