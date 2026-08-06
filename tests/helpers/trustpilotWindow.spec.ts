import { expect, test } from '@playwright/test'
import { waitForNewPagePopup } from './trustpilotWindow'

test.describe('waitForNewPagePopup', () => {
  test('returns the popup page opened by the trigger click', async ({ page, context }) => {
    await page.setContent(`
      <button id="open" onclick="window.open('about:blank', '_blank')">open</button>
    `)

    const popup = await waitForNewPagePopup(context, async () => {
      await page.locator('#open').click()
    })

    expect(popup).not.toBe(page)
    expect(popup.isClosed()).toBe(false)
    await expect(popup).toHaveURL('about:blank')
    await popup.close()
  })

  test('waits for the popup event before resolving', async ({ page, context }) => {
    await page.setContent(`
      <button id="open" onclick="setTimeout(() => window.open('about:blank', '_blank'), 50)">open</button>
    `)

    const started = Date.now()
    const popup = await waitForNewPagePopup(context, async () => {
      await page.locator('#open').click()
    })
    expect(Date.now() - started).toBeGreaterThanOrEqual(40)
    expect(popup.isClosed()).toBe(false)
    await popup.close()
  })
})
