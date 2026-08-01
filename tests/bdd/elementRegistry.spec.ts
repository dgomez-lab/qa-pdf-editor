import { test, expect } from '@playwright/test'
import { finderToLocator, getLocatorForPage, resolvePageForElement } from './elementRegistry'

function mockPage() {
  const calls: string[] = []
  const page = {
    locator(selector: string) {
      calls.push(selector)
      return { selector }
    }
  }
  return { page: page as never, calls }
}

test.describe('elementRegistry page resolution and finders', () => {
  test.beforeAll(() => {
    if (typeof globalThis.CSS === 'undefined') {
      globalThis.CSS = {
        escape(value: string) {
          return value.replace(/[^a-zA-Z0-9_-]/g, (ch) => `\\${ch}`)
        }
      } as typeof CSS
    }
  })

  test('resolvePageForElement keeps the current page when the label exists there', () => {
    expect(resolvePageForElement('Home', 'forms header link')).toBe('Home')
    expect(resolvePageForElement('CrmCustomer', 'customer domain')).toBe('CrmCustomer')
  })

  test('resolvePageForElement falls back through the CRM/editor search order', () => {
    expect(resolvePageForElement('Home', 'customer domain')).toBe('CrmCustomer')
    expect(resolvePageForElement('Dashboard', 'login button')).toBe('Editor')
  })

  test('resolvePageForElement returns the current page when no registry match exists', () => {
    expect(resolvePageForElement('Account', 'element that does not exist')).toBe('Account')
  })

  test('finderToLocator maps data-id, css, id, xpath, and escaped className finders', () => {
    const { page, calls } = mockPage()

    finderToLocator(page, { 'data-id': 'domain' })
    finderToLocator(page, { css: '.top-bar' })
    finderToLocator(page, { id: 'main' })
    finderToLocator(page, { xpath: '//div[@data-id="x"]' })
    finderToLocator(page, { xpath: 'span[@role="button"]' })
    finderToLocator(page, { className: 'LinearLoader__Line-sc-b80cdf49-0 hwQvSV' })

    expect(calls).toEqual([
      '[data-id="domain"]',
      '.top-bar',
      `#${CSS.escape('main')}`,
      'xpath=//div[@data-id="x"]',
      'xpath=/span[@role="button"]',
      '.LinearLoader__Line-sc-b80cdf49-0.hwQvSV'
    ])

    const special = mockPage()
    finderToLocator(special.page, { className: 'foo:bar' })
    expect(special.calls).toEqual(['.foo\\:bar'])
  })

  test('getLocatorForPage resolves a known CRM element and rejects unknown pages/labels', () => {
    const { page, calls } = mockPage()
    getLocatorForPage(page, 'CrmCustomer', 'customer domain')
    expect(calls).toEqual(['[data-id="domain"]'])

    expect(() => getLocatorForPage(page, 'UnknownPage', 'x')).toThrow(/Unknown page for elements/)
    expect(() => getLocatorForPage(page, 'CrmCustomer', 'missing label')).toThrow(
      /No element "missing label" on page CrmCustomer/
    )
  })
})
