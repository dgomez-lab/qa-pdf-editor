import type { Page } from '@playwright/test'
import type { BddWorld } from './fixtures'

export function primaryOrPopup(w: BddWorld, main: Page): Page {
  if (w.popup && !w.popup.isClosed()) return w.popup
  return main
}
