import type { Page } from '@playwright/test'
import { gotoMarketingPath } from '../../helpers/mvpsUrl'
import { landing } from './landingSelectors'

export class LandingPage {
  constructor(private readonly page: Page) {}

  async loadPath(path: string): Promise<void> {
    await gotoMarketingPath(this.page, path, { waitUntil: 'domcontentloaded' })
  }

  uploadInputLocator(): ReturnType<Page['locator']> {
    return this.page.locator(landing.uploadDocumentButton).first()
  }
}
