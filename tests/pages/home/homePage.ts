import * as path from 'path'
import type { Page } from '@playwright/test'
import { openHome, type OpenHomeOptions } from '../../helpers/navigation'
import { home } from './homeSelectors'

const samplePdf = path.join(__dirname, '..', '..', 'fixtures', 'sample.pdf')

export class HomePage {
  constructor(private readonly page: Page) {}

  async loadPage(options?: OpenHomeOptions): Promise<void> {
    await openHome(this.page, options)
  }

  async uploadPdfDocument(): Promise<void> {
    await this.page.locator(home.fileInput).first().setInputFiles(samplePdf)
  }
}
