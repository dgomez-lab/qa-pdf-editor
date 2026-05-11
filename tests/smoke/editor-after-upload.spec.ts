import * as path from 'path'
import { test, expect } from '@playwright/test'
import { openHome } from '../helpers/navigation'
import { editor, home } from '../pages/editorSelectors'

const samplePdf = path.join(__dirname, '..', 'fixtures', 'sample.pdf')

test.describe('Smoke — editor toolbar tras subir PDF', { tag: ['@PDFEDITOR_SMOKE', '@PDFEDITOR_SMOKE_EDITOR_UPLOAD'] }, () => {
  test(
    'carga Home, sube PDF y aparece el botón de descarga (flujo tipo Default)',
    { tag: ['@PDFEDITOR_SMOKE_EDITOR_UPLOAD'] },
    async ({ page }) => {
      test.setTimeout(240_000)
      await openHome(page)
      const fileInput = page.locator(home.fileInput).first()
      await fileInput.setInputFiles(samplePdf)
      const download = page.locator(editor.downloadButton).first()
      await expect(download).toBeVisible({ timeout: 180_000 })
    }
  )
})
