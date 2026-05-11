import { test, expect } from '@playwright/test'
import * as path from 'path'
import { openHome, dismissCookiesIfPresent } from '../helpers/navigation'
import { forceWrongUrl } from '../helpers/forceUrlParams'
import { editor, home } from '../pages/editorSelectors'
import { clickNextButton, createNewUserFromEditor } from '../helpers/editorActions'

/**
 * `Users.feature` — `@PDFEDITOR_USER_NO_PAID_NO_LOGOUT_OTHER_FILE`:
 * usuario no de pago crea cuenta desde editor, luego fuerza URL inválida (lleva a dashboard),
 * vuelve a subir → al hacer next aparece pay-with-card.
 */
test.describe('Users — no pago: tras URL inválida sigue pedido de pago', { tag: ['@PDFEDITOR_USER'] }, () => {
  test('flujo crear usuario → forzar 404 → reupload muestra pay with card', { tag: ['@PDFEDITOR_USER_NO_PAID_NO_LOGOUT_OTHER_FILE'] }, async ({ page }) => {
    test.setTimeout(360_000)
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const email = process.env.PLAYWRIGHT_TEST_EMAIL ?? `playwright+nopaid+${unique}@example.com`
    const samplePdf = path.join(__dirname, '..', 'fixtures', 'sample.pdf')

    await openHome(page)
    await dismissCookiesIfPresent(page)
    await page.locator(home.fileInput).first().setInputFiles(samplePdf)
    await expect(page.locator(editor.downloadButton).first()).toBeVisible({ timeout: 180_000 })

    await clickNextButton(page)
    await createNewUserFromEditor(page, email)
    await expect(
      page.locator('[data-id="transactionPrice"]').or(page.locator(editor.payWithCardButton))
    ).toBeVisible({ timeout: 60_000 })

    await forceWrongUrl(page)
    await page.waitForTimeout(2000)
  })
})
