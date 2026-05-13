import { test, expect } from '@playwright/test'
import { dismissCookiesIfPresent } from '../helpers/navigation'
import { landingPathFor } from '../helpers/multiFormatUpload'
import { gotoMarketingPath } from '../helpers/mvpsUrl'

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

type Product = { tag: string; slug: string; pngBase: string }

const products: Product[] = [
  { tag: '@PDFEDITOR_VISUAL_PRODUCT_COMPRESS', slug: 'compressPDF', pngBase: 'compress' },
  { tag: '@PDFEDITOR_VISUAL_PRODUCT_EDIT', slug: 'editPDF', pngBase: 'edit' },
  { tag: '@PDFEDITOR_VISUAL_PRODUCT_EDIT_FILL', slug: 'editFillPDF', pngBase: 'edit-fill' },
  { tag: '@PDFEDITOR_VISUAL_PRODUCT_EDIT_SCANNED', slug: 'editScannedPDF', pngBase: 'edit-scanned' },
  { tag: '@PDFEDITOR_VISUAL_PRODUCT_INSERT_IMAGE', slug: 'insertImage', pngBase: 'insert-image' },
  { tag: '@PDFEDITOR_VISUAL_PRODUCT_WATERMARK', slug: 'watermark', pngBase: 'watermark' },
  { tag: '@PDFEDITOR_VISUAL_PRODUCT_ROTATE', slug: 'rotatePDF', pngBase: 'rotate' },
  { tag: '@PDFEDITOR_VISUAL_PRODUCT_DELETE_PAGES', slug: 'deletePdfPages', pngBase: 'delete-pages' },
  { tag: '@PDFEDITOR_VISUAL_PRODUCT_PDF_READER', slug: 'pdfReader', pngBase: 'pdf-reader' },
  { tag: '@PDFEDITOR_VISUAL_PRODUCT_WORD_TO_PDF', slug: 'wordToPDF', pngBase: 'word-to-pdf' },
  { tag: '@PDFEDITOR_VISUAL_PRODUCT_JPG_TO_PDF', slug: 'jpgToPDF', pngBase: 'jpg-to-pdf' },
  { tag: '@PDFEDITOR_VISUAL_PRODUCT_PNG_TO_PDF', slug: 'pngToPDF', pngBase: 'png-to-pdf' },
  { tag: '@PDFEDITOR_VISUAL_PRODUCT_POWERPOINT_TO_PDF', slug: 'pwpToPDF', pngBase: 'powerpoint-to-pdf' },
  { tag: '@PDFEDITOR_VISUAL_PRODUCT_EXCEL_TO_PDF', slug: 'excelToPDF', pngBase: 'excel-to-pdf' },
  { tag: '@PDFEDITOR_VISUAL_PRODUCT_SIGN', slug: 'signPdf', pngBase: 'sign' },
  { tag: '@PDFEDITOR_VISUAL_PRODUCT_PDF_TO_WORD', slug: 'howToConvertPdfWord', pngBase: 'pdf-to-word' },
  { tag: '@PDFEDITOR_VISUAL_PRODUCT_PDF_TO_JPG', slug: 'pdfToJpg', pngBase: 'pdf-to-jpg' },
  { tag: '@PDFEDITOR_VISUAL_PRODUCT_PDF_TO_PNG', slug: 'pdfToPng', pngBase: 'pdf-to-png' },
  { tag: '@PDFEDITOR_VISUAL_PRODUCT_PDF_TO_POWERPOINT', slug: 'pdfToPwp', pngBase: 'pdf-to-powerpoint' },
  { tag: '@PDFEDITOR_VISUAL_PRODUCT_PDF_TO_EXCEL', slug: 'pdfToExcel', pngBase: 'pdf-to-excel' },
  { tag: '@PDFEDITOR_VISUAL_PRODUCT_SPLIT', slug: 'splitPdf', pngBase: 'split' },
  { tag: '@PDFEDITOR_VISUAL_PRODUCT_MERGE', slug: 'mergePDF', pngBase: 'merge' }
]

/**
 * `Visual.feature` — Scenario Outline "Visual comparison of all products" (22 LPs).
 */
test.describe('Visual — productos / LPs', { tag: ['@PDFEDITOR_VISUAL'] }, () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!visualSnapshotsEnabled(), 'PLAYWRIGHT_VISUAL_SNAPSHOTS=1')
    await page.setViewportSize({ width: 1280, height: 720 })
  })

  for (const p of products) {
    test(`Product LP ${p.pngBase}`, { tag: [p.tag] }, async ({ page }) => {
      await gotoMarketingPath(page, landingPathFor(p.slug), { waitUntil: 'domcontentloaded' }).catch(() => {})
      await dismissCookiesIfPresent(page)
      await page.locator('main, body').first().waitFor({ state: 'visible', timeout: 30_000 }).catch(() => {})
      await page.waitForTimeout(2000)
      await expect(page).toHaveScreenshot(`visual-product-${p.pngBase}.png`, screenshotOptions)
    })
  }
})
