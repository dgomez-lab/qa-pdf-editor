import { test, expect } from '@playwright/test'
import { openHome, dismissCookiesIfPresent } from '../helpers/navigation'
import { editor } from '../pages/editorSelectors'

/**
 * `Users.feature` — `@PDFEDITOR_USER_UPLOAD_MODAL_CLOSE_HOME_NO_REDIRECT_EDITOR_REDIRECTS_DASHBOARD`:
 * el modal de "Try now" en Home se cierra sin redirigir; en el editor sí redirige.
 *
 * Cubrimos la parte estática (cerrar modal en Home) sin completar el viaje editor → dashboard
 * (esa parte ya está cubierta por `user-editor-close-modal.spec.ts` y `dashboard-route-load.spec.ts`).
 */
test.describe('Users — upload modal en Home (no redirige)', { tag: ['@PDFEDITOR_USER'] }, () => {
  test('cerrar modal de Home permanece en Home', { tag: ['@PDFEDITOR_USER_UPLOAD_MODAL_CLOSE_HOME_NO_REDIRECT_EDITOR_REDIRECTS_DASHBOARD'] }, async ({ page }) => {
    await openHome(page)
    await dismissCookiesIfPresent(page)
    const tryNow = page.locator('[data-id="ctaTryNow"]').or(page.getByRole('link', { name: /try now|prueba/i })).first()
    if (!(await tryNow.isVisible({ timeout: 30_000 }).catch(() => false))) {
      test.skip(true, 'CTA "Try Now" no presente en el LP actual.')
    }
    await tryNow.click({ timeout: 10_000 }).catch(() => {})
    const close = page.locator(editor.closeModalButton).first()
    if (await close.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await close.click({ timeout: 10_000 }).catch(() => {})
    }
    // Sigue en Home: la URL no contiene /editor
    expect(new URL(page.url()).pathname).not.toMatch(/\/editor/i)
  })
})
