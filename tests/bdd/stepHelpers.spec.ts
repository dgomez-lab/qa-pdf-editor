import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { bddPage, visualSnapshotBaseForPageLabel } from './stepHelpers'
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

test.describe('visualSnapshotBaseForPageLabel', () => {
  test('maps known visual pages to stable snapshot basenames', () => {
    expect(visualSnapshotBaseForPageLabel('Home')).toBe('visual-home')
    expect(visualSnapshotBaseForPageLabel('Editor Modal No Paid')).toBe('visual-editor-modal-no-paid')
    expect(visualSnapshotBaseForPageLabel('Dashboard Trash Bin')).toBe('visual-dashboard-trash')
    expect(visualSnapshotBaseForPageLabel('PDF To Word')).toBe('visual-product-pdf-to-word')
    expect(visualSnapshotBaseForPageLabel('404')).toBe('visual-404')
  })

  test('trims labels and slugifies unknown pages', () => {
    expect(visualSnapshotBaseForPageLabel('  Home  ')).toBe('visual-home')
    expect(visualSnapshotBaseForPageLabel('Custom Page!')).toBe('visual-custom-page-')
    expect(visualSnapshotBaseForPageLabel('Foo/Bar Baz')).toBe('visual-foo-bar-baz')
  })
})

test.describe('bddPage CRM and popup routing', () => {
  test('uses open CRM page for CRM currentPage values', () => {
    const main = pageStub(false)
    const crm = pageStub(false)
    expect(bddPage(world({ currentPage: 'CrmCustomer', crmPage: crm }), main)).toBe(crm)
    expect(bddPage(world({ currentPage: 'CrmCustomersTable', crmPage: crm }), main)).toBe(crm)
    expect(bddPage(world({ currentPage: 'CrmHome', crmPage: crm }), main)).toBe(crm)
  })

  test('falls back to popup/main when CRM page is missing or closed', () => {
    const main = pageStub(false)
    const popup = pageStub(false)
    expect(bddPage(world({ currentPage: 'CrmCustomer', crmPage: null }), main)).toBe(main)
    expect(bddPage(world({ currentPage: 'CrmCustomer', crmPage: pageStub(true) }), main)).toBe(main)
    expect(
      bddPage(world({ currentPage: 'CrmCustomer', crmPage: null, popup }), main)
    ).toBe(popup)
  })

  test('non-CRM pages use popup when open', () => {
    const main = pageStub(false)
    const popup = pageStub(false)
    const crm = pageStub(false)
    expect(bddPage(world({ currentPage: 'Editor', crmPage: crm, popup }), main)).toBe(popup)
  })
})
