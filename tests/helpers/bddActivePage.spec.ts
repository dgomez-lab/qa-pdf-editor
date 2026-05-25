import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { marketingPage, primaryOrPopup } from '../bdd/activePage'
import type { BddWorld } from '../bdd/fixtures'
import { bddPage, closeCrmPageIfOpen, visualSnapshotBaseForPageLabel } from '../bdd/stepHelpers'

function pageStub(label: string, closed = false, onClose?: () => Promise<void> | void): Page {
  return {
    label,
    isClosed: () => closed,
    close: async () => {
      closed = true
      await onClose?.()
    }
  } as unknown as Page
}

function world(overrides: Partial<BddWorld> = {}): BddWorld {
  return {
    testData: {},
    recurrenceNumber: 0,
    email: '',
    currentPage: 'Home',
    crmPage: null,
    popup: null,
    ...overrides
  }
}

test.describe('BDD active page selection', () => {
  test('primaryOrPopup and marketingPage prefer an open popup over the main page', () => {
    const main = pageStub('main')
    const popup = pageStub('popup')
    const w = world({ popup })

    expect(primaryOrPopup(w, main)).toBe(popup)
    expect(marketingPage(w, main)).toBe(popup)
  })

  test('primaryOrPopup falls back to main when popup is absent or closed', () => {
    const main = pageStub('main')

    expect(primaryOrPopup(world(), main)).toBe(main)
    expect(primaryOrPopup(world({ popup: pageStub('popup', true) }), main)).toBe(main)
  })

  test('bddPage routes CRM current pages to the CRM tab before popup or main', () => {
    const main = pageStub('main')
    const popup = pageStub('popup')
    const crmPage = pageStub('crm')
    const w = world({ currentPage: 'CrmCustomer', crmPage, popup })

    expect(bddPage(w, main)).toBe(crmPage)
  })

  test('marketingPage ignores a CRM tab so URL checks stay on main or popup pages', () => {
    const main = pageStub('main')
    const crmPage = pageStub('crm')
    const w = world({ currentPage: 'CrmCustomer', crmPage })

    expect(marketingPage(w, main)).toBe(main)
  })

  test('closeCrmPageIfOpen closes open CRM pages and always clears the world reference', async () => {
    let closeCalls = 0
    const crmPage = pageStub('crm', false, async () => {
      closeCalls += 1
      throw new Error('already closing')
    })
    const w = world({ crmPage })

    await closeCrmPageIfOpen(w)

    expect(closeCalls).toBe(1)
    expect(w.crmPage).toBeNull()
  })
})

test.describe('visual snapshot base names', () => {
  test('uses legacy baseline names for known page labels', () => {
    expect(visualSnapshotBaseForPageLabel('Editor Modal No Paid')).toBe('visual-editor-modal-no-paid')
    expect(visualSnapshotBaseForPageLabel('Dashboard Trash Bin')).toBe('visual-dashboard-trash')
  })

  test('normalizes unknown labels into stable visual baseline names', () => {
    expect(visualSnapshotBaseForPageLabel('  Custom / QA Modal!!  ')).toBe('visual-custom-qa-modal-')
  })
})
