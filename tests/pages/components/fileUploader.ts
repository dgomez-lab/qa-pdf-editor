import type { Page } from '@playwright/test'
import { home } from '../editorSelectors'

export class FileUploader {
  constructor(private readonly page: Page) {}

  async setInputFiles(filePath: string): Promise<void> {
    await this.page.locator(home.fileInput).first().setInputFiles(filePath)
  }
}
