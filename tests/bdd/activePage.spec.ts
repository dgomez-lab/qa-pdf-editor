import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { marketingPage, primaryOrPopup } from './activePage'
import type { BddWorld } from './fixtures'

function pageStub(closed: boolean): Page {
  return { isClosed: () => closed } as Page
}

function world(partial: Partial<BddWorld> = {}): BddWorld {
  return {
    testData: {},
    recurrenceNumber: 0,
    email: '',
    currentPage: 'Home',
    crmPage: null,
    popup: null,
    ...partial
  }
}

test.describe('activePage popup routing', () => {
  test('primaryOrPopup prefers an open popup over the main page', () => {
    const main = pageStub(false)
    const popup = pageStub(false)
    expect(primaryOrPopup(world({ popup }), main)).toBe(popup)
  })

  test('primaryOrPopup falls back to main when popup is missing or closed', () => {
    const main = pageStub(false)
    expect(primaryOrPopup(world({ popup: null }), main)).toBe(main)
    expect(primaryOrPopup(world({ popup: pageStub(true) }), main)).toBe(main)
  })

  test('marketingPage delegates to primaryOrPopup', () => {
    const main = pageStub(false)
    const popup = pageStub(false)
    expect(marketingPage(world({ popup }), main)).toBe(popup)
    expect(marketingPage(world({ popup: null }), main)).toBe(main)
  })
})
