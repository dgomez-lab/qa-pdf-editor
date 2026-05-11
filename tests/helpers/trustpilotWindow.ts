import type { BrowserContext, Page } from '@playwright/test'

/**
 * Helper para esperar y devolver la ventana abierta tras clic en el botón "happy" de Trustpilot.
 */
export async function waitForNewPagePopup(context: BrowserContext, triggerClick: () => Promise<void>): Promise<Page> {
  const popupPromise = context.waitForEvent('page', { timeout: 30_000 })
  await triggerClick()
  const popup = await popupPromise
  await popup.waitForLoadState('domcontentloaded').catch(() => {})
  return popup
}
