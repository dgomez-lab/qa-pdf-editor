import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { logElementAction } from '../bdd/bddLogger'
import { editor, home } from '../pages/editorSelectors'
import { fixturePathFor } from './multiFormatUpload'
import { isPdfhintScenario } from './pdfhintScenario'

export async function waitForEditorAfterUpload(page: Page): Promise<void> {
  logElementAction('Waiting for', 'download button', editor.downloadButton)
  const downloadFirst = page.locator(editor.downloadButton).first()
  await expect(downloadFirst).toBeVisible({ timeout: 180_000 })
  logElementAction('Waiting until hide', 'loading overlay', editor.loadingOverlay)
  const overlay = page.locator(editor.loadingOverlay).first()
  await overlay.waitFor({ state: 'hidden', timeout: 120_000 }).catch(() => {})
  await page.waitForTimeout(2000)
}

export type ClickNextButtonOptions = {
  flow?: string
}

export async function dismissModalBackdropIfPresent(page: Page): Promise<void> {
  const backdrop = page.locator(editor.modalBackdrop).first()
  if (await backdrop.isVisible().catch(() => false)) {
    await backdrop.click({ force: true }).catch(() => {})
  }
  await page.evaluate(() => {
    const el = document.querySelector('div#outside')
    if (el instanceof HTMLElement) {
      el.click()
      el.remove()
    }
  })
}

export async function clickNextButton(page: Page, opts?: ClickNextButtonOptions): Promise<void> {
  const flow = (opts?.flow ?? 'Default').trim()
  await page.waitForTimeout(10_000)

  if (flow === 'Direct') {
    logElementAction('Waiting for', 'upload document button', editor.uploadDocumentButton)
    const uploadBtn = page.locator(editor.uploadDocumentButton).first()
    await uploadBtn.waitFor({ state: 'visible', timeout: 60_000 })
    await uploadBtn.click()
    const pdfPath = fixturePathFor('PDF')
    if (!pdfPath) throw new Error('Missing sample.pdf')
    if (isPdfhintScenario()) {
      const hero = page.locator(home.uploadDocumentHeroInput).first()
      await hero.waitFor({ state: 'attached', timeout: 120_000 })
      await hero.setInputFiles(pdfPath)
      await page
        .locator(home.uploadLoadingOverlay)
        .first()
        .waitFor({ state: 'hidden', timeout: 120_000 })
        .catch(() => {})
    } else {
      await page.locator(home.uploadDocumentButton).first().setInputFiles(pdfPath)
    }
    await waitForEditorAfterUpload(page)
  }

  await dismissModalBackdropIfPresent(page)
  logElementAction('Waiting for', 'download button', editor.downloadButton)
  const downloadFirst = page.locator(editor.downloadButton).first()
  await expect(downloadFirst).toBeVisible({ timeout: 180_000 })
  logElementAction('Waiting until hide', 'loading overlay', editor.loadingOverlay)
  const overlay = page.locator(editor.loadingOverlay).first()
  await overlay.waitFor({ state: 'hidden', timeout: 120_000 }).catch(() => {})
  await page.waitForTimeout(10_000)
  logElementAction('Clicking', 'download button', editor.downloadButton)
  await downloadFirst.click({ force: true })
}

export async function createNewUserFromEditor(page: Page, email: string): Promise<void> {
  logElementAction('Waiting for', 'email input', editor.emailInput)
  await page.locator(editor.emailInput).waitFor({ state: 'visible', timeout: 60_000 })
  logElementAction('Filling', 'email input', editor.emailInput)
  await page.locator(editor.emailInput).fill(email)
  logElementAction('Clicking', 'download login button', editor.downloadLoginButton)
  await page.locator(editor.downloadLoginButton).click()
}

export async function loginExistingUserFromEditor(page: Page, email: string): Promise<void> {
  logElementAction('Waiting for', 'email input', editor.emailInput)
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
