import { test, expect } from '@playwright/test'
import { mergeTestDataFromTable } from '../bdd/bddTestData'
import type { BddWorld } from '../bdd/fixtures'
import type { DataTable } from 'playwright-bdd'

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

function table(rows: Array<Record<string, string | null | undefined>>): DataTable {
  return {
    hashes: () => rows
  } as unknown as DataTable
}

test.describe('mergeTestDataFromTable', () => {
  test('trims keys and values from the first data row', () => {
    const w = world()

    mergeTestDataFromTable(w, table([{ ' email ': ' user@example.com ', card: ' Visa ', empty: null }]))

    expect(w.testData).toEqual({
      email: 'user@example.com',
      card: 'Visa',
      empty: ''
    })
    expect(w.email).toBe('user@example.com')
  })

  test('preserves existing world email when the table email is blank', () => {
    const w = world({ email: 'existing@example.com', testData: { email: 'existing@example.com' } })

    mergeTestDataFromTable(w, table([{ email: '   ', ip: ' Default ' }]))

    expect(w.testData).toEqual({ email: '', ip: 'Default' })
    expect(w.email).toBe('existing@example.com')
  })

  test('throws when the table has no rows', () => {
    const w = world()

    expect(() => mergeTestDataFromTable(w, table([]))).toThrow('Test data table has no rows')
  })
})
