import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { editor } from '../pages/editorSelectors'

/**
 * Pasos atómicos del editor reutilizables (paridad con `EditorPage` legacy:
 * `clickNextButton`, `closeModal`, `createNewUserFromTheEditor`, etc.).
 */

export async function clickNextButton(page: Page): Promise<void> {
  const candidates = [
    page.locator('[data-id="ctaContinue"]'),
    page.locator('[data-id="next"]'),
    page.getByRole('button', { name: /^(Next|Siguiente|Suivant|Weiter|Avanti|Próximo|次へ|다음|Volgende|التالي)$/i }),
    page.locator(editor.downloadButton)
  ]
  for (const loc of candidates) {
    const first = loc.first()
    if (await first.isVisible({ timeout: 5000 }).catch(() => false)) {
      await first.click({ timeout: 10_000 }).catch(() => {})
      return
    }
  }
  // último recurso: forzar click sobre el botón download (es el next del editor en muchos flujos)
  await page.locator(editor.downloadButton).first().click({ force: true })
}

export async function createNewUserFromEditor(page: Page, email: string): Promise<void> {
  await page.locator(editor.emailInput).waitFor({ state: 'visible', timeout: 60_000 })
  await page.locator(editor.emailInput).fill(email)
  await page.locator(editor.downloadLoginButton).click()
}

export async function loginExistingUserFromEditor(page: Page, email: string): Promise<void> {
  await page.locator(editor.emailInput).waitFor({ state: 'visible', timeout: 60_000 })
  await page.locator(editor.emailInput).fill(email)
  await page.locator(editor.downloadLoginButton).click()
}

export async function clickCloseModalButton(page: Page): Promise<void> {
  const btn = page.locator(editor.closeModalButton).first()
  if (await btn.isVisible({ timeout: 8000 }).catch(() => false)) {
    await btn.click({ timeout: 10_000 }).catch(() => {})
  }
}

export async function waitPaymentSuccessDownloadButton(page: Page): Promise<void> {
  const btn = page.locator(`xpath=${editor.paymentSuccessDownloadButton}`).first()
  await expect(btn).toBeVisible({ timeout: 120_000 })
}

export async function clickPaymentSuccessDownloadButton(page: Page): Promise<void> {
  await waitPaymentSuccessDownloadButton(page)
  await page.locator(`xpath=${editor.paymentSuccessDownloadButton}`).first().click({ force: true })
}

export const trustpilotHappyBtn = '[data-id="reviewHappy"]'
export const trustpilotNotHappyBtn = '[data-id="reviewNotHappy"]'
export const shareToolbarBtn = '[data-id="shareToolbar"]'
export const convertToolbarBtn = '[data-id="convertToolbar"]'
export const selectFormatModalContinue = '[data-id="ctaContinue"]'
export const emailShareModalEmailInput = '[data-id="shareEmailInput"]'
