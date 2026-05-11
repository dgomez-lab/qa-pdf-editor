import { test, expect } from '@playwright/test'
import { dismissCookiesIfPresent } from '../helpers/navigation'

const lpCases: { tag: string; path: string; title: string }[] = [
  { tag: '@PDFEDITOR_SMOKE_LP_MERGE', path: '/lp/merge-pdf', title: '/lp/merge-pdf' },
  { tag: '@PDFEDITOR_SMOKE_LP_EDIT', path: '/lp/edit-pdf', title: '/lp/edit-pdf' },
  { tag: '@PDFEDITOR_SMOKE_LP_SIGN', path: '/lp/sign-pdf', title: '/lp/sign-pdf' },
  { tag: '@PDFEDITOR_SMOKE_LP_SPLIT', path: '/lp/split-pdf', title: '/lp/split-pdf' },
  { tag: '@PDFEDITOR_SMOKE_LP_COMPRESS', path: '/lp/compress-pdf', title: '/lp/compress-pdf' },
  { tag: '@PDFEDITOR_SMOKE_LP_WATERMARK', path: '/lp/watermark', title: '/lp/watermark' },
  { tag: '@PDFEDITOR_SMOKE_LP_ROTATE', path: '/lp/rotate-pdf', title: '/lp/rotate-pdf' }
]

test.describe('Smoke — LP herramientas (marketing)', { tag: ['@PDFEDITOR_SMOKE'] }, () => {
  for (const { tag, path, title } of lpCases) {
    test(`${title} carga`, { tag: [tag] }, async ({ page }) => {
      await page.goto(path, { waitUntil: 'domcontentloaded' })
      await dismissCookiesIfPresent(page)
      await expect(page.locator('main').first()).toBeVisible({ timeout: 60_000 })
    })
  }
})
