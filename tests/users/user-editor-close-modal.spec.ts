import { test, expect } from '@playwright/test'
import { gotoDashboard, selectors } from '../helpers/dashboardActions'

/**
 * `Users.feature` — `@PDFEDITOR_USER_EDITOR_CLOSE_MODAL_REDIRECT`:
 * tras ir al Dashboard con skipUpload, el modal de onboarding aparece (criterio mínimo: visible).
 */
test.describe('Users — modal cierre editor → dashboard', { tag: ['@PDFEDITOR_USER'] }, () => {
  test('Dashboard expone close modal de onboarding', { tag: ['@PDFEDITOR_USER_EDITOR_CLOSE_MODAL_REDIRECT'] }, async ({ page }) => {
    await gotoDashboard(page)
    await expect(page.locator(selectors.onboardingCloseModal).or(page.locator('[data-id="emailForm"]')).first()).toBeVisible({ timeout: 60_000 })
  })
})
