import { expect, test } from '@playwright/test'
import { marketingMainOrHero } from './marketingPage'

test.describe('marketingMainOrHero', () => {
  test('prefers main content when present', async ({ page }) => {
    await page.setContent('<main id="root">marketing body</main><h1>ignored title</h1>')
    await expect(marketingMainOrHero(page)).toHaveAttribute('id', 'root')
    await expect(marketingMainOrHero(page)).toHaveText('marketing body')
  })

  test('falls back to heading when MVPS layout omits main', async ({ page }) => {
    await page.setContent('<div class="layout"><h3>Frequently asked questions</h3></div>')
    await expect(marketingMainOrHero(page)).toHaveText('Frequently asked questions')
  })

  test('uses the first matching heading among h1/h2/h3', async ({ page }) => {
    await page.setContent('<h2>Secondary</h2><h3>Tertiary</h3>')
    await expect(marketingMainOrHero(page)).toHaveText('Secondary')
  })
})
