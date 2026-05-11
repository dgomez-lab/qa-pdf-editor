import * as path from 'path'
import { test, expect } from '@playwright/test'
import { openHome, dismissCookiesIfPresent } from '../helpers/navigation'
import { isPdfhintSite } from '../helpers/seoExpectations'
import { editor, home } from '../pages/editorSelectors'

const samplePdf = path.join(__dirname, '..', 'fixtures', 'sample.pdf')

function visualSnapshotsEnabled(): boolean {
  const v = process.env.PLAYWRIGHT_VISUAL_SNAPSHOTS?.trim()
  return v === '1' || v === 'true' || v === 'yes'
}

const screenshotOptions = {
  fullPage: false,
  animations: 'disabled' as const,
  caret: 'hide' as const,
  scale: 'css' as const,
  maxDiffPixels: 2500
}

/**
 * Sustituto Playwright de `Visual.feature` + resemble (captura viewport fija 1280×720).
 * Baselines: `tests/visual/visual-public-pages.spec.ts-snapshots/` (generar con
 * `PLAYWRIGHT_VISUAL_SNAPSHOTS=1 npx playwright test tests/visual --update-snapshots`).
 */
test.describe('Visual — páginas públicas', { tag: ['@PDFEDITOR_VISUAL'] }, () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!visualSnapshotsEnabled(), 'PLAYWRIGHT_VISUAL_SNAPSHOTS=1 para ejecutar o actualizar baselines')
    await page.setViewportSize({ width: 1280, height: 720 })
  })

  test('Home', { tag: ['@PDFEDITOR_VISUAL_HOME'] }, async ({ page }) => {
    await openHome(page)
    await page.waitForTimeout(2000)
    await dismissCookiesIfPresent(page)
    await page.waitForTimeout(1000)
    await expect(page).toHaveScreenshot('visual-home.png', screenshotOptions)
  })

  test('Login', { tag: ['@PDFEDITOR_VISUAL_LOGIN'] }, async ({ page }) => {
    if (isPdfhintSite()) {
      await openHome(page)
      const loginLink = page.getByRole('link', { name: /log\s*in/i }).first()
      await loginLink.waitFor({ state: 'visible', timeout: 30_000 })
      await loginLink.click()
      await page.waitForURL(/\/login/i, { timeout: 60_000 })
    } else {
      await page.goto('/login', { waitUntil: 'domcontentloaded' })
    }
    await dismissCookiesIfPresent(page)
    await page.waitForLoadState('domcontentloaded')
    await page.locator('body').waitFor({ state: 'visible', timeout: 10_000 })
    await page.waitForTimeout(4000)
    await expect(page).toHaveScreenshot('visual-login.png', screenshotOptions)
  })

  test('Forms', { tag: ['@PDFEDITOR_VISUAL_FORMS'] }, async ({ page }) => {
    await page.goto('/forms', { waitUntil: 'domcontentloaded' })
    await dismissCookiesIfPresent(page)
    await page.locator('main').waitFor({ state: 'visible', timeout: 60_000 })
    await page.waitForTimeout(2000)
    await expect(page).toHaveScreenshot('visual-forms.png', screenshotOptions)
  })

  test('Contact', { tag: ['@PDFEDITOR_VISUAL_CONTACT'] }, async ({ page }) => {
    await page.goto('/contact', { waitUntil: 'domcontentloaded' })
    await dismissCookiesIfPresent(page)
    await page.locator('main').waitFor({ state: 'visible', timeout: 60_000 }).catch(() => {})
    await page.waitForTimeout(2000)
    await expect(page).toHaveScreenshot('visual-contact.png', screenshotOptions)
  })

  test('About', { tag: ['@PDFEDITOR_VISUAL_ABOUT'] }, async ({ page }) => {
    await page.goto('/about', { waitUntil: 'domcontentloaded' })
    await dismissCookiesIfPresent(page)
    await page.locator('main').waitFor({ state: 'visible', timeout: 60_000 }).catch(() => {})
    await page.waitForTimeout(2000)
    await expect(page).toHaveScreenshot('visual-about.png', screenshotOptions)
  })

  test('FAQs', { tag: ['@PDFEDITOR_VISUAL_FAQS'] }, async ({ page }) => {
    await page.goto('/faqs', { waitUntil: 'domcontentloaded' })
    await dismissCookiesIfPresent(page)
    await page.locator('main').waitFor({ state: 'visible', timeout: 60_000 }).catch(() => {})
    await page.waitForTimeout(2000)
    await expect(page).toHaveScreenshot('visual-faqs.png', screenshotOptions)
  })

  test('Privacy', { tag: ['@PDFEDITOR_VISUAL_PRIVACY'] }, async ({ page }) => {
    await page.goto('/privacy', { waitUntil: 'domcontentloaded' })
    await dismissCookiesIfPresent(page)
    await page.locator('main').waitFor({ state: 'visible', timeout: 60_000 }).catch(() => {})
    await page.waitForTimeout(2000)
    await expect(page).toHaveScreenshot('visual-privacy.png', screenshotOptions)
  })

  test('Cookies', { tag: ['@PDFEDITOR_VISUAL_COOKIES'] }, async ({ page }) => {
    await page.goto('/cookies', { waitUntil: 'domcontentloaded' })
    await dismissCookiesIfPresent(page)
    await page.locator('main').waitFor({ state: 'visible', timeout: 60_000 }).catch(() => {})
    await page.waitForTimeout(2000)
    await expect(page).toHaveScreenshot('visual-cookies.png', screenshotOptions)
  })

  test('Terms', { tag: ['@PDFEDITOR_VISUAL_TERMS'] }, async ({ page }) => {
    await page.goto('/terms-and-conditions', { waitUntil: 'domcontentloaded' })
    await dismissCookiesIfPresent(page)
    await page.locator('main').waitFor({ state: 'visible', timeout: 60_000 }).catch(() => {})
    await page.waitForTimeout(2000)
    await expect(page).toHaveScreenshot('visual-terms.png', screenshotOptions)
  })

  test('LP merge PDF', { tag: ['@PDFEDITOR_VISUAL_LP_MERGE'] }, async ({ page }) => {
    await page.goto('/lp/merge-pdf', { waitUntil: 'domcontentloaded' })
    await dismissCookiesIfPresent(page)
    await page.locator('main').waitFor({ state: 'visible', timeout: 60_000 }).catch(() => {})
    await page.waitForTimeout(2000)
    await expect(page).toHaveScreenshot('visual-lp-merge-pdf.png', screenshotOptions)
  })

  test('LP edit PDF', { tag: ['@PDFEDITOR_VISUAL_LP_EDIT'] }, async ({ page }) => {
    await page.goto('/lp/edit-pdf', { waitUntil: 'domcontentloaded' })
    await dismissCookiesIfPresent(page)
    await page.locator('main').waitFor({ state: 'visible', timeout: 60_000 }).catch(() => {})
    await page.waitForTimeout(2000)
    await expect(page).toHaveScreenshot('visual-lp-edit-pdf.png', screenshotOptions)
  })

  test('LP sign PDF', { tag: ['@PDFEDITOR_VISUAL_LP_SIGN'] }, async ({ page }) => {
    await page.goto('/lp/sign-pdf', { waitUntil: 'domcontentloaded' })
    await dismissCookiesIfPresent(page)
    await page.locator('main').waitFor({ state: 'visible', timeout: 60_000 }).catch(() => {})
    await page.waitForTimeout(2000)
    await expect(page).toHaveScreenshot('visual-lp-sign-pdf.png', screenshotOptions)
  })

  test('LP split PDF', { tag: ['@PDFEDITOR_VISUAL_LP_SPLIT'] }, async ({ page }) => {
    await page.goto('/lp/split-pdf', { waitUntil: 'domcontentloaded' })
    await dismissCookiesIfPresent(page)
    await page.locator('main').waitFor({ state: 'visible', timeout: 60_000 }).catch(() => {})
    await page.waitForTimeout(2000)
    await expect(page).toHaveScreenshot('visual-lp-split-pdf.png', screenshotOptions)
  })

  test('LP compress PDF', { tag: ['@PDFEDITOR_VISUAL_LP_COMPRESS'] }, async ({ page }) => {
    await page.goto('/lp/compress-pdf', { waitUntil: 'domcontentloaded' })
    await dismissCookiesIfPresent(page)
    await page.locator('main').waitFor({ state: 'visible', timeout: 60_000 }).catch(() => {})
    await page.waitForTimeout(2000)
    await expect(page).toHaveScreenshot('visual-lp-compress-pdf.png', screenshotOptions)
  })

  test('LP watermark', { tag: ['@PDFEDITOR_VISUAL_LP_WATERMARK'] }, async ({ page }) => {
    await page.goto('/lp/watermark', { waitUntil: 'domcontentloaded' })
    await dismissCookiesIfPresent(page)
    await page.locator('main').waitFor({ state: 'visible', timeout: 60_000 }).catch(() => {})
    await page.waitForTimeout(2000)
    await expect(page).toHaveScreenshot('visual-lp-watermark.png', screenshotOptions)
  })

  test('LP rotate PDF', { tag: ['@PDFEDITOR_VISUAL_LP_ROTATE'] }, async ({ page }) => {
    await page.goto('/lp/rotate-pdf', { waitUntil: 'domcontentloaded' })
    await dismissCookiesIfPresent(page)
    await page.locator('main').waitFor({ state: 'visible', timeout: 60_000 }).catch(() => {})
    await page.waitForTimeout(2000)
    await expect(page).toHaveScreenshot('visual-lp-rotate-pdf.png', screenshotOptions)
  })

  test('Editor', { tag: ['@PDFEDITOR_VISUAL_EDITOR'] }, async ({ page }) => {
    test.setTimeout(240_000)
    await openHome(page)
    await dismissCookiesIfPresent(page)
    await page.locator(home.fileInput).first().setInputFiles(samplePdf)
    const download = page.locator(editor.downloadButton).first()
    await expect(download).toBeVisible({ timeout: 180_000 })
    await page.locator(editor.loadingOverlay).first().waitFor({ state: 'hidden', timeout: 120_000 }).catch(() => {})
    await page.waitForTimeout(2000)
    await expect(page).toHaveScreenshot('visual-editor.png', screenshotOptions)
  })

  test('Upload modal (Home)', { tag: ['@PDFEDITOR_VISUAL_UPLOAD_MODAL'] }, async ({ page }) => {
    test.setTimeout(120_000)
    await openHome(page)
    await dismissCookiesIfPresent(page)
    const tryNow = page.locator('[data-id="ctaTryNow"]').or(page.getByRole('link', { name: /try now/i })).first()
    if (await tryNow.isVisible({ timeout: 15_000 }).catch(() => false)) {
      await tryNow.click({ timeout: 5_000 }).catch(() => {})
    }
    await page.waitForTimeout(1500)
    await expect(page).toHaveScreenshot('visual-upload-modal.png', screenshotOptions)
  })

  test('About Us (footer)', { tag: ['@PDFEDITOR_VISUAL_ABOUT_US'] }, async ({ page }) => {
    await page.goto('/about', { waitUntil: 'domcontentloaded' })
    await dismissCookiesIfPresent(page)
    await page.locator('main').waitFor({ state: 'visible', timeout: 60_000 }).catch(() => {})
    await page.waitForTimeout(2000)
    await expect(page).toHaveScreenshot('visual-about-us.png', screenshotOptions)
  })

  test('Downloads', { tag: ['@PDFEDITOR_VISUAL_DOWNLOADS'] }, async ({ page }) => {
    await page.goto('/downloads', { waitUntil: 'domcontentloaded' }).catch(() => {})
    await dismissCookiesIfPresent(page)
    await page.locator('main, body').first().waitFor({ state: 'visible', timeout: 30_000 }).catch(() => {})
    await page.waitForTimeout(1500)
    await expect(page).toHaveScreenshot('visual-downloads.png', screenshotOptions)
  })

  test('Terms of Use', { tag: ['@PDFEDITOR_VISUAL_TERMS_OF_USE'] }, async ({ page }) => {
    await page.goto('/terms', { waitUntil: 'domcontentloaded' }).catch(() => {})
    await dismissCookiesIfPresent(page)
    await page.locator('main').first().waitFor({ state: 'visible', timeout: 30_000 }).catch(() => {})
    await page.waitForTimeout(1500)
    await expect(page).toHaveScreenshot('visual-terms-of-use.png', screenshotOptions)
  })

  test('Privacy Policy', { tag: ['@PDFEDITOR_VISUAL_PRIVACY_POLICY'] }, async ({ page }) => {
    await page.goto('/privacy', { waitUntil: 'domcontentloaded' })
    await dismissCookiesIfPresent(page)
    await page.locator('main').first().waitFor({ state: 'visible', timeout: 30_000 }).catch(() => {})
    await page.waitForTimeout(1500)
    await expect(page).toHaveScreenshot('visual-privacy-policy.png', screenshotOptions)
  })

  test('Terms and Conditions', { tag: ['@PDFEDITOR_VISUAL_TERMS_AND_CONDITIONS'] }, async ({ page }) => {
    await page.goto('/terms-and-conditions', { waitUntil: 'domcontentloaded' })
    await dismissCookiesIfPresent(page)
    await page.locator('main').first().waitFor({ state: 'visible', timeout: 30_000 }).catch(() => {})
    await page.waitForTimeout(1500)
    await expect(page).toHaveScreenshot('visual-terms-and-conditions.png', screenshotOptions)
  })

  test('404 page', { tag: ['@PDFEDITOR_VISUAL_404'] }, async ({ page }) => {
    await page.goto('/this-page-should-not-exist', { waitUntil: 'domcontentloaded' }).catch(() => {})
    await dismissCookiesIfPresent(page)
    await page.locator('body').waitFor({ state: 'visible', timeout: 30_000 }).catch(() => {})
    await page.waitForTimeout(1500)
    await expect(page).toHaveScreenshot('visual-404.png', screenshotOptions)
  })
})
