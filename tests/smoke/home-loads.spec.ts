import { test, expect } from '@playwright/test'
import { isPdfhintSite } from '../helpers/seoExpectations'
import { openHome } from '../helpers/navigation'

test.describe('Smoke — Home', { tag: ['@PDFEDITOR_SMOKE'] }, () => {
  test('Home carga y muestra el logo', { tag: ['@PDFEDITOR_SMOKE_HOME'] }, async ({ page }) => {
    await openHome(page)
    if (isPdfhintSite()) {
      await expect(page.getByRole('link', { name: /pdfhint Home/i }).first()).toBeVisible()
    } else {
      await expect(page.locator('[data-id="logo"]').first()).toBeVisible()
    }
  })
})
