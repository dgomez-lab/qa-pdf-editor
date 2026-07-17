import { test, expect } from '@playwright/test'
import { dismissModalBackdropIfPresent } from './editorActions'

test.describe('editor modal backdrop dismissal', () => {
  test('clicks and removes the configured modal backdrop', async ({ page }) => {
    await page.setContent(`
      <body data-backdrop-clicks="0">
        <div
          id="outside"
          class="BackScreen_overlay"
          onclick="document.body.dataset.backdropClicks = String(Number(document.body.dataset.backdropClicks) + 1)"
        ></div>
      </body>
    `)

    await dismissModalBackdropIfPresent(page)

    await expect(page.locator('body')).toHaveAttribute('data-backdrop-clicks', '2')
    await expect(page.locator('div#outside')).toHaveCount(0)
  })

  test('removes an outside backdrop when its class does not match the configured selector', async ({
    page
  }) => {
    await page.setContent(`
      <body data-backdrop-clicks="0">
        <div
          id="outside"
          class="legacy-backdrop"
          onclick="document.body.dataset.backdropClicks = String(Number(document.body.dataset.backdropClicks) + 1)"
        ></div>
      </body>
    `)

    await dismissModalBackdropIfPresent(page)

    await expect(page.locator('body')).toHaveAttribute('data-backdrop-clicks', '1')
    await expect(page.locator('div#outside')).toHaveCount(0)
  })
})
