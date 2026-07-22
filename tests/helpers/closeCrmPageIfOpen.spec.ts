import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import type { BddWorld } from '../bdd/fixtures'
import { closeCrmPageIfOpen } from '../bdd/stepHelpers'

function worldWithCrmPage(crmPage: Page | null): BddWorld {
  return {
    testData: {},
    recurrenceNumber: 0,
    email: '',
    currentPage: 'CrmCustomer',
    crmPage,
    popup: null
  }
}

test.describe('closeCrmPageIfOpen', () => {
  test('closes an open CRM page and clears its reference', async () => {
    let closeCalls = 0
    const crmPage = {
      isClosed: () => false,
      close: async () => {
        closeCalls += 1
      }
    } as unknown as Page
    const world = worldWithCrmPage(crmPage)

    await closeCrmPageIfOpen(world)

    expect(closeCalls).toBe(1)
    expect(world.crmPage).toBeNull()
  })

  test('clears an already closed CRM page without closing it again', async () => {
    let closeCalls = 0
    const crmPage = {
      isClosed: () => true,
      close: async () => {
        closeCalls += 1
      }
    } as unknown as Page
    const world = worldWithCrmPage(crmPage)

    await closeCrmPageIfOpen(world)

    expect(closeCalls).toBe(0)
    expect(world.crmPage).toBeNull()
  })

  test('clears the CRM page reference when closing fails', async () => {
    const crmPage = {
      isClosed: () => false,
      close: async () => {
        throw new Error('page already detached')
      }
    } as unknown as Page
    const world = worldWithCrmPage(crmPage)

    await expect(closeCrmPageIfOpen(world)).resolves.toBeUndefined()
    expect(world.crmPage).toBeNull()
  })

  test('remains idempotent when no CRM page is open', async () => {
    const world = worldWithCrmPage(null)

    await expect(closeCrmPageIfOpen(world)).resolves.toBeUndefined()
    expect(world.crmPage).toBeNull()
  })
})
