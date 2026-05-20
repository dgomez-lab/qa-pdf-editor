import type { Page } from '@playwright/test'
import { downloads } from './downloadsSelectors'

export class DownloadsPage {
  constructor(private readonly page: Page) {}

  async fillDownloadCode(code: string): Promise<void> {
    await this.page.locator(downloads.downloadCodeInput).first().fill(code)
  }

  async clickDownload(): Promise<void> {
    await this.page.locator(downloads.ctaDownloadButton).click()
  }
}
