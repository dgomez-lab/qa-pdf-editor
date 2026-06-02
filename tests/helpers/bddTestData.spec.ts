import { test, expect } from '@playwright/test'
import type { DataTable } from 'playwright-bdd'
import type { BddWorld } from '../bdd/fixtures'
import { mergeTestDataFromTable } from '../bdd/bddTestData'

function dataTable(rows: Array<Record<string, string | undefined>>): DataTable {
  return {
    hashes: () => rows
  } as DataTable
}

function world(overrides?: Partial<BddWorld>): BddWorld {
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

test.describe('bddTestData table merge', () => {
  test('trims keys and values and mirrors a provided email to the BDD world', () => {
    const w = world()

    mergeTestDataFromTable(
      w,
      dataTable([
        {
          ' email ': ' buyer@example.com ',
          card: ' Visa ',
          ip: ' ES '
        }
      ])
    )

    expect(w.testData).toEqual({
      email: 'buyer@example.com',
      card: 'Visa',
      ip: 'ES'
    })
    expect(w.email).toBe('buyer@example.com')
  })

  test('does not overwrite world email when the email cell is blank after trimming', () => {
    const w = world({ email: 'existing@example.com' })

    mergeTestDataFromTable(w, dataTable([{ email: '   ', card: 'JCB' }]))

    expect(w.testData.email).toBe('')
    expect(w.testData.card).toBe('JCB')
    expect(w.email).toBe('existing@example.com')
  })

  test('throws when the data table has no rows', () => {
    expect(() => mergeTestDataFromTable(world(), dataTable([]))).toThrow('Test data table has no rows')
  })
})
