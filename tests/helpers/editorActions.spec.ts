import { test, expect } from '@playwright/test'
import { dismissModalBackdropIfPresent } from './editorActions'

test.describe('editor modal backdrop dismissal', () => {
  test('clicks and removes the configured modal backdrop', async ({ page }) => {
    await page.setContent(`
      <div id="outside" class="BackScreen_overlay"></div>
    `)

    await dismissModalBackdropIfPresent(page)

    await expect(page.locator('div#outside')).toHaveCount(0)
  })

  test('removes an outside backdrop when its class does not match the configured selector', async ({
    page
  }) => {
    await page.setContent(`
      <div id="outside" class="legacy-backdrop"></div>
    `)

    await dismissModalBackdropIfPresent(page)

    await expect(page.locator('div#outside')).toHaveCount(0)
  })
})
