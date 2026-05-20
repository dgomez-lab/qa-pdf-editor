import type { Page } from '@playwright/test'
import { contact } from './contactSelectorsBundle'

export class ContactPage {
  constructor(private readonly page: Page) {}

  async fillFirstName(value: string): Promise<void> {
    await this.page.locator(contact.firstName).fill(value)
  }

  async fillLastName(value: string): Promise<void> {
    await this.page.locator(contact.lastName).fill(value)
  }

  async fillEmail(value: string): Promise<void> {
    await this.page.locator(contact.email).fill(value)
  }

  async fillMessage(value: string): Promise<void> {
    await this.page.locator(contact.message).fill(value)
  }

  async acceptTerms(): Promise<void> {
    await this.page.locator(contact.acceptTerms).click()
  }

  async send(): Promise<void> {
    await this.page.locator(contact.sendButton).click()
  }
}
